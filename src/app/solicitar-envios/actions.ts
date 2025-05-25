
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SolicitudEnvioIndividualFormData } from "@/lib/schemas";
import { estadoEnvioEnum } from "@/lib/schemas";
import type { Database, NuevoEnvioIndividual, TipoServicio } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

async function geocodeAddressInMarDelPlata(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_GEOCODING_API_KEY is not set. Geocoding will be skipped for Solicitud de Envío.");
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
      console.warn(`Geocoded address for Solicitud "${address}" is outside Mar del Plata bounds.`);
      return null;
    }
    console.warn(`Geocoding failed for Solicitud address "${address}": ${data.status}`, data.error_message || '');
    return null;
  } catch (error) {
    console.error("Error calling Geocoding API for Solicitud:", error);
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
    let geocodingInfo = "";

    let finalLatRetiro = latitud_retiro_provista ?? null;
    let finalLngRetiro = longitud_retiro_provista ?? null;

    if ((finalLatRetiro === null || finalLngRetiro === null) && formData.direccion_retiro) {
        const coordsRetiro = await geocodeAddressInMarDelPlata(formData.direccion_retiro);
        if (coordsRetiro) {
            finalLatRetiro = coordsRetiro.lat;
            finalLngRetiro = coordsRetiro.lng;
            geocodingInfo += "Dirección de retiro geocodificada. ";
        } else {
            geocodingInfo += "No se pudo geocodificar dirección de retiro o está fuera de MDP. ";
        }
    } else if (finalLatRetiro !== null && finalLngRetiro !== null) {
        geocodingInfo += "Coordenadas de retiro provistas por cotizador. ";
    }


    let finalLatEntrega = latitud_entrega_provista ?? null;
    let finalLngEntrega = longitud_entrega_provista ?? null;
     if ((finalLatEntrega === null || finalLngEntrega === null) && formData.direccion_entrega) {
        const coordsEntrega = await geocodeAddressInMarDelPlata(formData.direccion_entrega);
        if (coordsEntrega) {
            finalLatEntrega = coordsEntrega.lat;
            finalLngEntrega = coordsEntrega.lng;
            geocodingInfo += "Dirección de entrega geocodificada. ";
        } else {
            geocodingInfo += "No se pudo geocodificar dirección de entrega o está fuera de MDP. ";
        }
    } else if (finalLatEntrega !== null && finalLngEntrega !== null) {
        geocodingInfo += "Coordenadas de entrega provistas por cotizador. ";
    }

    let precioFinalParaGuardar = formData.precio_manual_servicio;
    
    if (formData.tipo_servicio_id && (formData.precio_manual_servicio === null || formData.precio_manual_servicio === undefined)) {
        const { data: servicioData, error: servicioError } = await supabase
            .from('tipos_servicio')
            .select('precio_base')
            .eq('id', formData.tipo_servicio_id)
            .single();
        if (servicioError) {
            console.warn("Error fetching servicio base price for envios_individuales table:", servicioError);
            // Keep precioFinalParaGuardar as is (which would be null from form default or cotizador)
        } else if (servicioData?.precio_base !== null && servicioData?.precio_base !== undefined) {
            precioFinalParaGuardar = servicioData.precio_base;
        }
    }
    
    const nuevoEnvioData: NuevoEnvioIndividual = {
      nombre_cliente: formData.nombre_cliente,
      email_cliente: formData.email_cliente || null,
      telefono_cliente: formData.telefono_cliente || null,
      direccion_retiro: formData.direccion_retiro,
      latitud_retiro: finalLatRetiro,
      longitud_retiro: finalLngRetiro,
      direccion_entrega: formData.direccion_entrega,
      latitud_entrega: finalLatEntrega,
      longitud_entrega: finalLngEntrega,
      tipo_paquete_id: formData.tipo_paquete_id,
      descripcion_paquete: formData.descripcion_paquete || null,
      peso_paquete: formData.peso_paquete || null,
      dimensiones_paquete: formData.dimensiones_paquete || null,
      tipo_servicio_id: formData.tipo_servicio_id || null,
      precio_final_servicio: precioFinalParaGuardar,
      status: estadoEnvioEnum.Values.pending, 
      notas_cliente: formData.notas_cliente || null,
      // cliente_id, fecha_solicitud, created_at will use defaults or are explicitly null
    };

    const { data: envioCreado, error: insertError } = await supabase
      .from("envios_individuales")
      .insert(nuevoEnvioData)
      .select()
      .single();

    if (insertError) {
      const pgError = insertError as PostgrestError;
      console.error("Error creating shipment in 'envios_individuales' table:", pgError);
      return { success: false, error: `No se pudo crear la solicitud de envío: ${pgError.message}`, info: geocodingInfo.trim() };
    }

    revalidatePath("/envios"); // Consider if this or another path needs revalidation
    
    return { success: true, error: null, info: `Solicitud de envío creada. ${geocodingInfo}`.trim() };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in createEnvioIndividualAction:", err);
    return { success: false, error: err.message || "Error desconocido del servidor al crear la solicitud.", info: null };
  }
}
