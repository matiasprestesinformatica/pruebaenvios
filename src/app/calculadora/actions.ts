
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TarifaDistanciaCalculadora, TipoCalculadoraServicioEnum, NuevoEnvio } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import type { SolicitudEnvioCalculadoraFormData } from "@/lib/schemas";
import { estadoEnvioEnum } from "@/lib/schemas";

// Function to geocode address - can be moved to a shared utils if used elsewhere
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


export async function getTarifasCalculadoraAction(
  tipoCalculadora: TipoCalculadoraServicioEnum
): Promise<{ data: TarifaDistanciaCalculadora[]; error: string | null }> {
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
      return { data: [], error: `Error al obtener fechas de vigencia: ${(dateError as PostgrestError).message}` };
    }

    if (!distinctDates || distinctDates.length === 0) {
      return { data: [], error: `No se encontraron tarifas vigentes para el servicio ${tipoCalculadora}.` };
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
      return { data: [], error: `Error al obtener tarifas: ${(tarifasError as PostgrestError).message}` };
    }
    return { data: tarifas || [], error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error(`Unexpected error in getTarifasCalculadoraAction for ${tipoCalculadora}:`, err);
    return { data: [], error: err.message || "Error desconocido del servidor al obtener tarifas." };
  }
}

export async function createEnvioDesdeCalculadoraAction(
  formData: SolicitudEnvioCalculadoraFormData
): Promise<{ success: boolean; error?: string | null; info?: string | null }> {
  try {
    const supabase = createSupabaseServerClient();

    // 1. Fetch ID for "Envíos Express" service type
    const { data: servicioExpress, error: servicioError } = await supabase
      .from('tipos_servicio')
      .select('id')
      .eq('nombre', 'Envíos Express') 
      .single();

    if (servicioError || !servicioExpress) {
      console.error("Error fetching 'Envíos Express' service type:", servicioError);
      return { success: false, error: "No se pudo encontrar el tipo de servicio 'Envíos Express'." };
    }
    const tipoServicioId = servicioExpress.id;

    // 2. Fetch ID for a default package type (e.g., "Caja Mediana")
    const { data: paqueteMediano, error: paqueteError } = await supabase
      .from('tipos_paquete')
      .select('id')
      .eq('nombre', 'Caja Mediana') 
      .eq('activo', true)
      .single();

    if (paqueteError || !paqueteMediano) {
      console.warn("Default package type 'Caja Mediana' not found or not active. Consider creating it or using another default.", paqueteError);
      return { success: false, error: "No se pudo encontrar un tipo de paquete por defecto ('Caja Mediana')." };
    }
    const tipoPaqueteId = paqueteMediano.id;

    // 3. Geocode direccionEntrega
    let latitud: number | null = null;
    let longitud: number | null = null;
    let geocodingInfo: string | null = null;

    if (formData.direccionEntrega) {
      const coords = await geocodeAddressInMarDelPlata(formData.direccionEntrega);
      if (coords) {
        latitud = coords.lat;
        longitud = coords.lng;
        geocodingInfo = "Dirección de entrega geocodificada exitosamente.";
      } else {
        geocodingInfo = "No se pudo geocodificar la dirección de entrega o está fuera de Mar del Plata. Coordenadas no guardadas.";
      }
    } else {
        geocodingInfo = "No se proporcionó dirección de entrega para geocodificar.";
    }
    
    // 4. Construct notas
    const notas = `Envío solicitado desde calculadora.
Remitente: ${formData.nombreEnvia}, Tel: ${formData.telefonoEnvia}.
Dirección de Retiro: ${formData.direccionRetiro}.
Horario Retiro Desde: ${formData.horarioRetiroDesde}.
Horario Entrega Hasta: ${formData.horarioEntregaHasta}.
Detalles Adicionales: ${formData.detallesAdicionales || 'Ninguno'}.`;

    // 5. Prepare new shipment data
    const nuevoEnvioData: NuevoEnvio = {
      cliente_id: null, 
      nombre_cliente_temporal: formData.nombreRecibe,
      client_location: formData.direccionEntrega,
      latitud: latitud, // Usar las coordenadas geocodificadas
      longitud: longitud, // Usar las coordenadas geocodificadas
      tipo_paquete_id: tipoPaqueteId,
      package_weight: 1, 
      status: estadoEnvioEnum.Values.pending,
      reparto_id: null,
      tipo_servicio_id: tipoServicioId,
      precio_servicio_final: formData.montoACobrar,
      notas: notas,
      suggested_options: null,
      reasoning: null,
    };

    // 6. Insert into envios table
    const { data: envioCreado, error: insertError } = await supabase
      .from('envios')
      .insert(nuevoEnvioData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating shipment from calculator:", insertError);
      return { success: false, error: `No se pudo crear el envío: ${(insertError as PostgrestError).message}` };
    }

    revalidatePath("/envios");
    return { success: true, error: null, info: `Envío para ${formData.nombreRecibe} creado. ${geocodingInfo || ''}` };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in createEnvioDesdeCalculadoraAction:", err);
    return { success: false, error: err.message || "Error desconocido del servidor al crear el envío." };
  }
}
