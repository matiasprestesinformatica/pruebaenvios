
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SolicitudEnvioIndividualFormData } from "@/lib/schemas";
import type { Database, NuevoEnvioIndividual, TipoServicio } from "@/types/supabase"; // Changed EnviosIndividuales to NuevoEnvioIndividual
import { revalidatePath } from "next/cache"; // Added for potential revalidation

// Re-use or adapt the geocoding function
async function geocodeAddressInMarDelPlata(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_GEOCODING_API_KEY is not set. Geocoding will be skipped.");
    return null;
  }

  const encodedAddress = encodeURIComponent(`${address}, Mar del Plata, Argentina`);
  const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&components=locality:Mar%20del%20Plata|administrative_area:Buenos%20Aires|country:AR`;

  try {
    const response = await fetch(geocodingUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const MDP_BOUNDS = { minLat: -38.15, maxLat: -37.90, minLng: -57.70, maxLng: -57.45 };
      if (location.lat >= MDP_BOUNDS.minLat && location.lat <= MDP_BOUNDS.maxLat &&
          location.lng >= MDP_BOUNDS.minLng && location.lng <= MDP_BOUNDS.maxLng) {
        return { lat: location.lat, lng: location.lng };
      } else {
        console.warn(`Geocoded address for "${address}" is outside Mar del Plata bounds. Coords: Lat ${location.lat}, Lng ${location.lng}`);
        return null;
      }
    } else {
      console.warn(`Geocoding failed for address "${address}": ${data.status}`, data.error_message || '');
      return null;
    }
  } catch (error) {
    console.error("Error calling Geocoding API:", error);
    return null;
  }
}


export async function createEnvioIndividualAction(
  formData: SolicitudEnvioIndividualFormData
): Promise<{ success: boolean; error?: string | null; info?: string | null }> {
  const supabase = createSupabaseServerClient();
  let geocodingInfoRetiro = "Geocodificación de retiro no realizada.";
  let geocodingInfoEntrega = "Geocodificación de entrega no realizada.";

  let latRetiro: number | null = formData.latitud_retiro ?? null;
  let lngRetiro: number | null = formData.longitud_retiro ?? null;
  let latEntrega: number | null = formData.latitud_entrega ?? null;
  let lngEntrega: number | null = formData.longitud_entrega ?? null;

  try {
    // Geocode Retiro Address if manual coords not provided
    if (latRetiro === null || lngRetiro === null) {
      const retiroCoords = await geocodeAddressInMarDelPlata(formData.direccion_retiro);
      if (retiroCoords) {
        latRetiro = retiroCoords.lat;
        lngRetiro = retiroCoords.lng;
        geocodingInfoRetiro = "Dirección de retiro geocodificada.";
      } else {
        geocodingInfoRetiro = "No se pudo geocodificar la dirección de retiro o está fuera de MDP.";
      }
    } else {
      geocodingInfoRetiro = "Coordenadas de retiro manuales utilizadas.";
    }

    // Geocode Entrega Address if manual coords not provided
    if (latEntrega === null || lngEntrega === null) {
      const entregaCoords = await geocodeAddressInMarDelPlata(formData.direccion_entrega);
      if (entregaCoords) {
        latEntrega = entregaCoords.lat;
        lngEntrega = entregaCoords.lng;
        geocodingInfoEntrega = "Dirección de entrega geocodificada.";
      } else {
        geocodingInfoEntrega = "No se pudo geocodificar la dirección de entrega o está fuera de MDP.";
      }
    } else {
      geocodingInfoEntrega = "Coordenadas de entrega manuales utilizadas.";
    }

    // Determine final service price
    let precioServicio: number | null = formData.precio_manual_servicio ?? null;
    if (formData.tipo_servicio_id && formData.precio_manual_servicio === null) {
        const { data: servicioData, error: servicioError } = await supabase
            .from('tipos_servicio')
            .select('precio_base')
            .eq('id', formData.tipo_servicio_id)
            .single();
        if (servicioError) {
            console.warn("Error fetching service price for envio individual:", servicioError.message);
        } else if (servicioData?.precio_base !== null) {
            precioServicio = servicioData.precio_base;
        }
    }
    
    const envioData: NuevoEnvioIndividual = {
      nombre_cliente: formData.nombre_cliente,
      email_cliente: formData.email_cliente || null,
      telefono_cliente: formData.telefono_cliente || null,
      direccion_retiro: formData.direccion_retiro,
      latitud_retiro: latRetiro,
      longitud_retiro: lngRetiro,
      direccion_entrega: formData.direccion_entrega,
      latitud_entrega: latEntrega,
      longitud_entrega: lngEntrega,
      tipo_paquete_id: formData.tipo_paquete_id,
      descripcion_paquete: formData.descripcion_paquete || null,
      peso_paquete: formData.peso_paquete || null,
      dimensiones_paquete: formData.dimensiones_paquete || null,
      tipo_servicio_id: formData.tipo_servicio_id || null,
      precio_manual_servicio: precioServicio, // Store the determined price here. Or rename column to precio_final_servicio
      status: 'pendiente', // Initial status
      fecha_solicitud: new Date().toISOString(),
      notas_cliente: formData.notas_cliente || null,
      // cliente_id would be set if we implement client lookup/creation based on email/phone
    };

    const { data: nuevoEnvio, error } = await supabase
      .from("envios_individuales")
      .insert(envioData)
      .select()
      .single();

    if (error) {
      console.error("Error inserting envio_individual:", error);
      return { success: false, error: error.message, info: `${geocodingInfoRetiro} ${geocodingInfoEntrega}` };
    }
    
    // Optional: Revalidate paths if these shipments are displayed elsewhere immediately
    // revalidatePath("/admin/envios-solicitados"); // Example

    return { 
        success: true, 
        info: `Solicitud de envío creada (ID: ${nuevoEnvio?.id}). ${geocodingInfoRetiro} ${geocodingInfoEntrega}`, 
        error: null 
    };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in createEnvioIndividualAction:", err);
    return { 
        success: false, 
        error: err.message || "Error desconocido en el servidor.", 
        info: `${geocodingInfoRetiro} ${geocodingInfoEntrega}`
    };
  }
}
