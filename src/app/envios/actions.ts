
"use server";

import { revalidatePath } from "next/cache";
import type { ShipmentFormData } from "@/lib/schemas";
import { shipmentSchema, estadoEnvioEnum } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { suggestDeliveryOptions, type SuggestDeliveryOptionsOutput } from "@/ai/flows/suggest-delivery-options";
import type { NuevoEnvio, Envio, EnvioConCliente, Cliente, UpdateEnvio, EnvioCompletoParaDialog, TipoServicio } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

async function geocodeAddressInMarDelPlata(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_GEOCODING_API_KEY is not set. Geocoding for shipment will be skipped.");
    return null;
  }

  const encodedAddress = encodeURIComponent(address);
  const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&components=locality:Mar%20del%20Plata|administrative_area:Buenos%20Aires|country:AR`;

  try {
    const response = await fetch(geocodingUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const MDP_BOUNDS = {
        minLat: -38.15, maxLat: -37.90,
        minLng: -57.70, maxLng: -57.45,
      };
      if (location.lat >= MDP_BOUNDS.minLat && location.lat <= MDP_BOUNDS.maxLat &&
          location.lng >= MDP_BOUNDS.minLng && location.lng <= MDP_BOUNDS.maxLng) {
        return { lat: location.lat, lng: location.lng };
      } else {
        console.warn(`Geocoded address for shipment "${address}" is outside Mar del Plata bounds.`);
        return null;
      }
    } else {
      console.warn(`Geocoding failed for shipment address "${address}": ${data.status}`, data.error_message || '');
      return null;
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error calling Geocoding API for shipment:", err.message);
    return null;
  }
}

export async function suggestDeliveryOptionsAction(
  data: Pick<ShipmentFormData, 'client_location' | 'package_weight' | 'tipo_paquete_id'> // Adjusted for tipo_paquete_id
): Promise<SuggestDeliveryOptionsOutput | null> {
  // We'd need to fetch tipo_paquete details if package_size for AI is derived from it.
  // For now, let's assume package_size for AI can be a placeholder or a simplified mapping.
  // This part might need further refinement based on how tipo_paquete maps to AI's concept of package_size.
  // For this example, I'll send a generic 'medium' if tipo_paquete_id is present.
  const packageSizeForAI = data.tipo_paquete_id ? 'medium' : 'small'; // Placeholder logic

  if (!data.client_location || data.package_weight == null || !data.tipo_paquete_id) {
     console.error("Validation error for AI suggestion: Missing required fields.");
     return null;
  }

  try {
    const aiInput = {
      clientLocation: data.client_location,
      packageSize: packageSizeForAI, // Use the derived or placeholder size
      packageWeight: data.package_weight,
    };
    const suggestions = await suggestDeliveryOptions(aiInput);
    return suggestions;
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error calling suggestDeliveryOptions AI flow:", err.message);
    return null;
  }
}


export async function createShipmentAction(
  formData: ShipmentFormData,
  aiSuggestions?: SuggestDeliveryOptionsOutput
): Promise<{ success: boolean; error?: string | null; data?: Envio | null; info?: string | null }> {
  const supabase = createSupabaseServerClient();
  let geocodingInfo: string | null = null;

  const validatedFields = shipmentSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
      data: null,
    };
  }

  const { cliente_id, nombre_cliente_temporal, client_location, tipo_paquete_id, package_weight, tipo_servicio_id, precio_servicio_final } = validatedFields.data;
  
  let lat: number | null = null;
  let lng: number | null = null;
  let finalClientLocation = client_location || "";
  let finalPrecioServicio = precio_servicio_final;

  if (cliente_id) {
    const { data: clientData, error: clientError } = await supabase
      .from('clientes')
      .select('direccion, latitud, longitud')
      .eq('id', cliente_id)
      .single();
    if (clientError || !clientData) {
      geocodingInfo = "Error al obtener datos del cliente. Usando dirección del formulario si existe.";
      if (finalClientLocation) {
        const coords = await geocodeAddressInMarDelPlata(finalClientLocation);
        if (coords) { lat = coords.lat; lng = coords.lng; geocodingInfo = "Dirección del formulario geocodificada (cliente no encontrado).";}
        else { geocodingInfo += " Falló geocodificación de dirección del formulario.";}
      }
    } else {
      finalClientLocation = clientData.direccion || finalClientLocation; // Prioritize client's address
      lat = clientData.latitud;
      lng = clientData.longitud;
      geocodingInfo = clientData.latitud ? "Coordenadas y ubicación del cliente utilizadas." : (finalClientLocation ? "Ubicación del cliente utilizada." : "Cliente sin dirección, usando ubicación del formulario si existe.");
       if ((!lat || !lng) && finalClientLocation) {
        const coords = await geocodeAddressInMarDelPlata(finalClientLocation);
        if (coords) { lat = coords.lat; lng = coords.lng; geocodingInfo = "Dirección del cliente geocodificada.";}
        else { geocodingInfo += " Falló geocodificación de dirección de cliente.";}
      }
    }
  } else if (finalClientLocation) {
    const coords = await geocodeAddressInMarDelPlata(finalClientLocation);
    if (coords) { lat = coords.lat; lng = coords.lng; geocodingInfo = "Dirección del formulario geocodificada.";}
    else { geocodingInfo = "No se pudo geocodificar dirección del formulario o está fuera de Mar del Plata.";}
  }

  if (tipo_servicio_id && (finalPrecioServicio === null || finalPrecioServicio === undefined)) {
    const { data: servicioData } = await supabase
        .from('tipos_servicio')
        .select('precio_base')
        .eq('id', tipo_servicio_id)
        .single();
    if (servicioData && servicioData.precio_base !== null) {
        finalPrecioServicio = servicioData.precio_base;
    }
  }


  const shipmentData: NuevoEnvio = {
    cliente_id: cliente_id || null,
    nombre_cliente_temporal: cliente_id ? null : (nombre_cliente_temporal || null),
    client_location: finalClientLocation,
    latitud: lat,
    longitud: lng,
    tipo_paquete_id: tipo_paquete_id || null,
    package_weight: package_weight,
    status: aiSuggestions ? estadoEnvioEnum.Values.suggested : estadoEnvioEnum.Values.pending,
    suggested_options: aiSuggestions ? aiSuggestions.suggestedOptions : null,
    reasoning: aiSuggestions ? aiSuggestions.reasoning : null,
    tipo_servicio_id: tipo_servicio_id || null,
    precio_servicio_final: finalPrecioServicio,
  };

  try {
    const { data: newShipment, error } = await supabase
      .from("envios")
      .insert(shipmentData)
      .select()
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      return { success: false, error: pgError.message || "No se pudo registrar el envío.", data: null, info: geocodingInfo };
    }

    revalidatePath("/envios");
    revalidatePath("/mapa-envios");
    return { success: true, data: newShipment, error: null, info: geocodingInfo };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err.message || 'Error desconocido del servidor.', data: null, info: geocodingInfo };
  }
}

export async function getClientesForShipmentFormAction(): Promise<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'email' | 'direccion' | 'latitud' | 'longitud'>[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, apellido, email, direccion, latitud, longitud") // Ensure latitud and longitud are selected
      .eq("estado", true) 
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error fetching clients for shipment form:", error);
      return [];
    }
    return data || [];
}

export async function getEnvioByIdAction(envioId: string): Promise<{ data: EnvioCompletoParaDialog | null; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("envios")
      .select(`
        *,
        clientes (id, nombre, apellido, direccion, email, telefono, latitud, longitud),
        repartos (id, fecha_reparto, repartidores(nombre)),
        tipos_servicio (id, nombre, precio_base),
        tipos_paquete (id, nombre) 
      `)
      .eq("id", envioId)
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      if (pgError.code === 'PGRST116') return { data: null, error: "Envío no encontrado." };
      return { data: null, error: pgError.message || "Error al obtener datos del envío." };
    }
    return { data: data as EnvioCompletoParaDialog, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { data: null, error: err.message || "Error desconocido del servidor." };
  }
}

export async function updateShipmentAction(
  envioId: string,
  formData: ShipmentFormData
): Promise<{ success: boolean; error?: string | null; data?: EnvioCompletoParaDialog | null; info?: string | null }> {
  const supabase = createSupabaseServerClient();
  let geocodingInfo: string | null = null;

  const validatedFields = shipmentSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
    };
  }

  const { cliente_id, nombre_cliente_temporal, client_location, tipo_paquete_id, package_weight, status, tipo_servicio_id, precio_servicio_final } = validatedFields.data;
  
  const updateData: Partial<UpdateEnvio> = {
    tipo_paquete_id: tipo_paquete_id || null,
    package_weight,
    status: status || undefined, 
    tipo_servicio_id: tipo_servicio_id || null,
    precio_servicio_final: precio_servicio_final,
  };
  
  let lat: number | null = null;
  let lng: number | null = null;
  let finalClientLocation = client_location || "";

  if (cliente_id) {
    updateData.cliente_id = cliente_id;
    updateData.nombre_cliente_temporal = null; 
    const { data: clientData } = await supabase.from('clientes').select('direccion, latitud, longitud').eq('id', cliente_id).single();
    if (clientData) {
      finalClientLocation = clientData.direccion || finalClientLocation;
      lat = clientData.latitud;
      lng = clientData.longitud;
      geocodingInfo = clientData.latitud ? "Coordenadas del cliente usadas." : (finalClientLocation ? "Ubicación del cliente usada." : "Cliente sin dirección.");
      if ((!lat || !lng) && finalClientLocation) {
          const coords = await geocodeAddressInMarDelPlata(finalClientLocation);
          if (coords) { lat = coords.lat; lng = coords.lng; geocodingInfo = "Dirección del cliente geocodificada.";}
          else { geocodingInfo += " Falló geocodificación de dirección de cliente.";}
      }
    } else {
      geocodingInfo = "Cliente no encontrado. Usando dirección del formulario.";
      if(finalClientLocation) {
        const coords = await geocodeAddressInMarDelPlata(finalClientLocation);
        if (coords) { lat = coords.lat; lng = coords.lng; geocodingInfo = "Dirección del formulario geocodificada.";}
        else { geocodingInfo += " Falló geocodificación de dirección del formulario.";}
      }
    }
  } else { 
    updateData.cliente_id = null;
    updateData.nombre_cliente_temporal = nombre_cliente_temporal || null;
    if (finalClientLocation) {
      const coords = await geocodeAddressInMarDelPlata(finalClientLocation);
      if (coords) { lat = coords.lat; lng = coords.lng; geocodingInfo = "Dirección del formulario geocodificada.";}
      else { geocodingInfo = "No se pudo geocodificar la dirección del formulario.";}
    }
  }
  updateData.client_location = finalClientLocation;
  updateData.latitud = lat;
  updateData.longitud = lng;

  if (updateData.tipo_servicio_id && (updateData.precio_servicio_final === null || updateData.precio_servicio_final === undefined)) {
    const { data: servicioData } = await supabase
        .from('tipos_servicio')
        .select('precio_base')
        .eq('id', updateData.tipo_servicio_id)
        .single();
    if (servicioData && servicioData.precio_base !== null) {
        updateData.precio_servicio_final = servicioData.precio_base;
    }
  }

  try {
    const { data: updatedShipmentData, error } = await supabase
      .from("envios")
      .update(updateData)
      .eq("id", envioId)
      .select(`*, clientes (id, nombre, apellido, direccion, email, telefono, latitud, longitud), repartos (id, fecha_reparto, repartidores(nombre)), tipos_servicio (id, nombre, precio_base), tipos_paquete (id, nombre)`)
      .single();

    if (error) {
      return { success: false, error: (error as PostgrestError).message || "No se pudo actualizar el envío." };
    }

    revalidatePath("/envios");
    revalidatePath(`/envios/${envioId}`); 
    revalidatePath(`/repartos`); 
    if (updatedShipmentData?.reparto_id) {
      revalidatePath(`/repartos/${updatedShipmentData.reparto_id}`);
    }
    revalidatePath("/mapa-envios");

    return { success: true, data: updatedShipmentData as EnvioCompletoParaDialog, error: null, info: geocodingInfo };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message || 'Error desconocido del servidor.' };
  }
}


export async function getEnviosAction(page = 1, pageSize = 10, searchTerm?: string): Promise<{ data: EnvioConCliente[]; count: number; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("envios")
      .select("*, clientes (id, nombre, apellido, direccion, email), tipos_paquete (nombre)", { count: "exact" }) // Added tipos_paquete (nombre)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (searchTerm) {
      // Simplified search for now, can be expanded
      query = query.or(`client_location.ilike.%${searchTerm}%,nombre_cliente_temporal.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      return { data: [], count: 0, error: pgError.message || "Ocurrió un error al cargar los envíos." };
    }
    return { data: (data as EnvioConCliente[]) || [], count: count || 0, error: null };
  } catch (e: unknown) {
    return { data: [], count: 0, error: (e as Error).message || 'Error desconocido del servidor.' };
  }
}
