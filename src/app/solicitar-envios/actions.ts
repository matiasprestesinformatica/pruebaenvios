
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SolicitudEnvioIndividualFormData } from "@/lib/schemas";
import { solicitudEnvioIndividualSchema, estadoEnvioEnum } from "@/lib/schemas";
import type { Database, NuevoEnvioIndividual, TipoServicio } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

// Re-using a similar geocoding function, ensure GOOGLE_GEOCODING_API_KEY is set
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
      }
      console.warn(`Geocoded address for "${address}" is outside Mar del Plata bounds.`);
      return null;
    }
    console.warn(`Geocoding failed for address "${address}": ${data.status}`, data.error_message || '');
    return null;
  } catch (error) {
    console.error("Error calling Geocoding API:", error);
    return null;
  }
}

export async function createEnvioIndividualAction(
  formData: SolicitudEnvioIndividualFormData,
  latitud_retiro_provista?: number | null,
  longitud_retiro_provista?: number | null,
  latitud_entrega_provista?: number | null,
  longitud_entrega_provista?: number | null
): Promise<{ success: boolean; error?: string | null; info?: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const validatedFields = solicitudEnvioIndividualSchema.safeParse(formData);

    if (!validatedFields.success) {
      return {
        success: false,
        error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
        info: null,
      };
    }
    const { data: validData } = validatedFields;
    let geocodingInfo = "";

    let latRetiro = latitud_retiro_provista ?? null;
    let lngRetiro = longitud_retiro_provista ?? null;
    if (latRetiro === null || lngRetiro === null) {
        const coordsRetiro = await geocodeAddressInMarDelPlata(validData.direccion_retiro);
        if (coordsRetiro) {
            latRetiro = coordsRetiro.lat;
            lngRetiro = coordsRetiro.lng;
            geocodingInfo += "Dirección de retiro geocodificada. ";
        } else {
            geocodingInfo += "No se pudo geocodificar dirección de retiro o está fuera de MDP. ";
        }
    } else {
        geocodingInfo += "Coordenadas de retiro provistas. ";
    }

    let latEntrega = latitud_entrega_provista ?? null;
    let lngEntrega = longitud_entrega_provista ?? null;
     if (latEntrega === null || lngEntrega === null) {
        const coordsEntrega = await geocodeAddressInMarDelPlata(validData.direccion_entrega);
        if (coordsEntrega) {
            latEntrega = coordsEntrega.lat;
            lngEntrega = coordsEntrega.lng;
            geocodingInfo += "Dirección de entrega geocodificada. ";
        } else {
            geocodingInfo += "No se pudo geocodificar dirección de entrega o está fuera de MDP. ";
        }
    } else {
        geocodingInfo += "Coordenadas de entrega provistas. ";
    }

    let precioFinalParaGuardar = validData.precio_manual_servicio;
    if (validData.tipo_servicio_id && (validData.precio_manual_servicio === null || validData.precio_manual_servicio === undefined)) {
        const { data: servicioData, error: servicioError } = await supabase
            .from('tipos_servicio')
            .select('precio_base')
            .eq('id', validData.tipo_servicio_id)
            .single();
        if (servicioError) {
            console.warn("Error fetching servicio base price:", servicioError);
        } else if (servicioData?.precio_base !== null && servicioData?.precio_base !== undefined) {
            precioFinalParaGuardar = servicioData.precio_base;
        }
    }
    
    const nuevoEnvioData: NuevoEnvioIndividual = {
      nombre_cliente: validData.nombre_cliente,
      email_cliente: validData.email_cliente || null,
      telefono_cliente: validData.telefono_cliente || null,
      direccion_retiro: validData.direccion_retiro,
      latitud_retiro: latRetiro,
      longitud_retiro: lngRetiro,
      direccion_entrega: validData.direccion_entrega,
      latitud_entrega: latEntrega,
      longitud_entrega: lngEntrega,
      tipo_paquete_id: validData.tipo_paquete_id || null,
      descripcion_paquete: validData.descripcion_paquete || null,
      peso_paquete: validData.peso_paquete || null,
      dimensiones_paquete: validData.dimensiones_paquete || null,
      tipo_servicio_id: validData.tipo_servicio_id || null,
      precio_manual_servicio: precioFinalParaGuardar, // Este campo en la BD almacena el precio final.
      status: estadoEnvioEnum.Values.pending, 
      notas_cliente: validData.notas_cliente || null,
      // fecha_solicitud will be set by default by DB
    };

    const { data: envioCreado, error: insertError } = await supabase
      .from("envios_individuales")
      .insert(nuevoEnvioData)
      .select()
      .single();

    if (insertError) {
      const pgError = insertError as PostgrestError;
      console.error("Error creating individual shipment:", pgError);
      return { success: false, error: `No se pudo crear la solicitud de envío: ${pgError.message}`, info: geocodingInfo };
    }

    // Revalidate relevant paths if needed, e.g., an admin dashboard for these requests
    // revalidatePath("/admin/solicitudes-envio"); 

    return { success: true, error: null, info: `Solicitud de envío creada. ${geocodingInfo}`.trim() };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in createEnvioIndividualAction:", err);
    return { success: false, error: err.message || "Error desconocido del servidor al crear la solicitud.", info: null };
  }
}
