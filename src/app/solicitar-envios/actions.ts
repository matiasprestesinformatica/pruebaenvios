
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SolicitudEnvioIndividualFormData } from "@/lib/schemas";
import type { Database, NuevoEnvioIndividual, TipoServicio } from "@/types/supabase"; 
import { revalidatePath } from "next/cache"; 

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
  formData: SolicitudEnvioIndividualFormData,
  latRetiroProvista?: number | null,
  lngRetiroProvista?: number | null,
  latEntregaProvista?: number | null,
  lngEntregaProvista?: number | null
): Promise<{ success: boolean; error?: string | null; info?: string | null }> {
  const supabase = createSupabaseServerClient();
  let geocodingInfoRetiro = "";
  let geocodingInfoEntrega = "";

  let latRetiro = latRetiroProvista ?? formData.latitud_retiro ?? null;
  let lngRetiro = lngRetiroProvista ?? formData.longitud_retiro ?? null;
  let latEntrega = latEntregaProvista ?? formData.latitud_entrega ?? null;
  let lngEntrega = lngEntregaProvista ?? formData.longitud_entrega ?? null;

  try {
    // Geocode Retiro Address if not provided by cotizador/form
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
      geocodingInfoRetiro = "Coordenadas de retiro provistas utilizadas.";
    }

    // Geocode Entrega Address if not provided by cotizador/form
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
      geocodingInfoEntrega = "Coordenadas de entrega provistas utilizadas.";
    }
    
    let precioServicioFinalDeterminado: number | null = formData.precio_manual_servicio;

    if (formData.tipo_servicio_id && formData.precio_manual_servicio === null) {
        const { data: servicioData, error: servicioError } = await supabase
            .from('tipos_servicio')
            .select('precio_base')
            .eq('id', formData.tipo_servicio_id)
            .single();
        if (servicioError) {
            console.warn("Error fetching service price for envio individual:", servicioError.message);
        } else if (servicioData?.precio_base !== null && servicioData?.precio_base !== undefined) {
            precioServicioFinalDeterminado = servicioData.precio_base;
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
      tipo_paquete_id: formData.tipo_paquete_id === "_NULL_OPTION_" ? null : formData.tipo_paquete_id,
      descripcion_paquete: formData.descripcion_paquete || null,
      peso_paquete: formData.peso_paquete || null,
      dimensiones_paquete: formData.dimensiones_paquete || null,
      tipo_servicio_id: formData.tipo_servicio_id === "_MANUAL_PRICE_" || formData.tipo_servicio_id === "_NULL_OPTION_" ? null : formData.tipo_servicio_id,
      precio_manual_servicio: precioServicioFinalDeterminado, 
      status: 'pendiente', 
      fecha_solicitud: new Date().toISOString(),
      notas_cliente: formData.notas_cliente || null,
    };

    const { data: nuevoEnvio, error } = await supabase
      .from("envios_individuales")
      .insert(envioData)
      .select("id") 
      .single();

    if (error) {
      console.error("Error inserting envio_individual:", error);
      return { success: false, error: error.message, info: `${geocodingInfoRetiro} ${geocodingInfoEntrega}` };
    }
    
    revalidatePath("/solicitar-envios"); 

    return { 
        success: true, 
        info: `Solicitud de envío (ID: ${nuevoEnvio?.id}) creada. ${geocodingInfoRetiro} ${geocodingInfoEntrega}`, 
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

export async function getTarifasCalculadoraAction(
  tipoCalculadora: 'lowcost' | 'express'
): Promise<{ data: TarifaDistanciaCalculadora[] | null; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: distinctDates, error: dateError } = await supabase
      .from('tarifas_distancia_calculadora')
      .select('fecha_vigencia_desde')
      .eq('tipo_calculadora', tipoCalculadora)
      .lte('fecha_vigencia_desde', today)
      .order('fecha_vigencia_desde', { ascending: false })
      .limit(1);

    if (dateError) {
      console.error(`Error fetching distinct vigencia dates for ${tipoCalculadora}:`, dateError);
      return { data: null, error: `Error al obtener fechas de vigencia: ${dateError.message}` };
    }

    if (!distinctDates || distinctDates.length === 0) {
      return { data: null, error: `No se encontraron tarifas vigentes para el servicio ${tipoCalculadora}.` };
    }
    const latestValidDate = distinctDates[0].fecha_vigencia_desde;

    const { data: tarifas, error: tarifasError } = await supabase
      .from('tarifas_distancia_calculadora')
      .select('*')
      .eq('tipo_calculadora', tipoCalculadora)
      .eq('fecha_vigencia_desde', latestValidDate)
      .order('distancia_hasta_km', { ascending: true });

    if (tarifasError) {
      console.error(`Error fetching tariffs for ${tipoCalculadora} on ${latestValidDate}:`, tarifasError);
      return { data: null, error: `Error al obtener tarifas: ${tarifasError.message}` };
    }
    return { data: tarifas || [], error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error(`Unexpected error in getTarifasCalculadoraAction for ${tipoCalculadora}:`, err);
    return { data: null, error: err.message || "Error desconocido del servidor al obtener tarifas." };
  }
}
