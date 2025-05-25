
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SolicitudEnvioIndividualFormData } from "@/lib/schemas";
import { estadoEnvioEnum } from "@/lib/schemas"; // Removed unused solicitudEnvioIndividualSchema
import type { Database, NuevoEnvio, TipoServicio } from "@/types/supabase"; // Changed to NuevoEnvio
import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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
    // Validation should happen in the component using Zod before calling this action
    // For safety, you could re-validate here if needed.

    let geocodingInfo = "";

    let latRetiro = latitud_retiro_provista ?? null;
    let lngRetiro = longitud_retiro_provista ?? null;
    if (latRetiro === null || lngRetiro === null) {
        const coordsRetiro = await geocodeAddressInMarDelPlata(formData.direccion_retiro);
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
        const coordsEntrega = await geocodeAddressInMarDelPlata(formData.direccion_entrega);
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

    let precioFinalParaGuardar = formData.precio_manual_servicio;
    let tipoServicioIdFinal = formData.tipo_servicio_id || null;

    if (formData.tipo_servicio_id && (formData.precio_manual_servicio === null || formData.precio_manual_servicio === undefined)) {
        const { data: servicioData, error: servicioError } = await supabase
            .from('tipos_servicio')
            .select('precio_base')
            .eq('id', formData.tipo_servicio_id)
            .single();
        if (servicioError) {
            console.warn("Error fetching servicio base price for envios table:", servicioError);
        } else if (servicioData?.precio_base !== null && servicioData?.precio_base !== undefined) {
            precioFinalParaGuardar = servicioData.precio_base;
        }
    } else if (formData.precio_manual_servicio !== null && formData.precio_manual_servicio !== undefined) {
        // If manual price is set, we typically nullify the service_id unless the UI logic ensures it's already null.
        // For now, we'll trust the form sends the correct tipo_servicio_id (null if manual price was the intent)
        // tipoServicioIdFinal = null; // This line might be needed if form doesn't nullify tipo_servicio_id when manual price is used.
    }
    
    const notasDetalladas = `
Información del Solicitante:
Nombre: ${formData.nombre_cliente}
Email: ${formData.email_cliente || 'No provisto'}
Teléfono: ${formData.telefono_cliente || 'No provisto'}

Detalles de Retiro:
Dirección: ${formData.direccion_retiro}
Coordenadas Retiro: Lat: ${latRetiro ?? 'N/A'}, Lng: ${lngRetiro ?? 'N/A'}

Detalles del Paquete:
Tipo ID: ${formData.tipo_paquete_id || 'No especificado'}
Descripción: ${formData.descripcion_paquete || 'No provista'}
Peso: ${formData.peso_paquete ? formData.peso_paquete + ' kg' : 'No provisto'}
Dimensiones: ${formData.dimensiones_paquete || 'No provistas'}

Notas Adicionales del Cliente:
${formData.notas_cliente || 'Ninguna'}
    `.trim();

    const nuevoEnvioData: NuevoEnvio = {
      cliente_id: null, // Public form, no cliente_id
      nombre_cliente_temporal: formData.nombre_cliente, // Assuming this is the recipient for the 'envios' table context
      client_location: formData.direccion_entrega,
      latitud: latEntrega,
      longitud: lngEntrega,
      tipo_paquete_id: formData.tipo_paquete_id,
      package_weight: formData.peso_paquete || 0.1, // Default if null
      status: estadoEnvioEnum.Values.pending, 
      tipo_servicio_id: tipoServicioIdFinal,
      precio_servicio_final: precioFinalParaGuardar,
      notas: notasDetalladas,
      // suggested_options and reasoning are null by default
    };

    const { data: envioCreado, error: insertError } = await supabase
      .from("envios") // Changed to "envios" table
      .insert(nuevoEnvioData)
      .select()
      .single();

    if (insertError) {
      const pgError = insertError as PostgrestError;
      console.error("Error creating shipment in 'envios' table:", pgError);
      return { success: false, error: `No se pudo crear la solicitud de envío: ${pgError.message}`, info: geocodingInfo };
    }

    revalidatePath("/envios"); 
    // Optionally revalidate other paths if this public request should appear somewhere else immediately

    return { success: true, error: null, info: `Solicitud de envío creada y guardada en la tabla principal de envíos. ${geocodingInfo}`.trim() };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in createEnvioIndividualAction:", err);
    return { success: false, error: err.message || "Error desconocido del servidor al crear la solicitud.", info: null };
  }
}
