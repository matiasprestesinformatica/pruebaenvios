
"use server";

import { revalidatePath } from "next/cache";
import type { ShipmentFormData } from "@/lib/schemas";
import { shipmentSchema, estadoEnvioEnum } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { suggestDeliveryOptions, type SuggestDeliveryOptionsOutput } from "@/ai/flows/suggest-delivery-options";
import type { NuevoEnvio, Envio, EnvioConCliente, Cliente, UpdateEnvio } from "@/types/supabase";
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
  } catch (error) {
    console.error("Error calling Geocoding API for shipment:", error);
    return null;
  }
}

export async function suggestDeliveryOptionsAction(
  data: ShipmentFormData
): Promise<SuggestDeliveryOptionsOutput | null> {
  const validatedFields = shipmentSchema.safeParse(data); // Status is optional, will not fail validation if absent
  if (!validatedFields.success) {
    console.error("Validation error for AI suggestion:", validatedFields.error.flatten().fieldErrors);
    return null;
  }

  try {
    const aiInput = {
      clientLocation: validatedFields.data.client_location || "",
      packageSize: validatedFields.data.package_size,
      packageWeight: validatedFields.data.package_weight,
    };
    const suggestions = await suggestDeliveryOptions(aiInput);
    return suggestions;
  } catch (error) {
    console.error("Error calling suggestDeliveryOptions AI flow:", error);
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

  const { cliente_id, nombre_cliente_temporal, client_location, package_size, package_weight } = validatedFields.data;
  
  let lat: number | null = null;
  let lng: number | null = null;
  let finalClientLocation = client_location || "";

  if (cliente_id) {
    const { data: clientData, error: clientError } = await supabase
      .from('clientes')
      .select('direccion, latitud, longitud')
      .eq('id', cliente_id)
      .single();
    if (clientError || !clientData) {
      console.error("Error fetching client for shipment creation:", clientError);
      // Decide if this is a hard error or proceed with provided location
    } else {
      finalClientLocation = clientData.direccion || finalClientLocation;
      lat = clientData.latitud;
      lng = clientData.longitud;
      geocodingInfo = clientData.latitud ? "Coordenadas del cliente utilizadas." : (clientData.direccion ? "Dirección del cliente utilizada (sin geocodificación previa)." : null);
    }
  } else if (finalClientLocation) {
    const coords = await geocodeAddressInMarDelPlata(finalClientLocation);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
      geocodingInfo = "Dirección geocodificada exitosamente.";
    } else {
      geocodingInfo = "No se pudo geocodificar la dirección o está fuera de Mar del Plata.";
    }
  }

  const shipmentData: NuevoEnvio = {
    cliente_id: cliente_id || null,
    nombre_cliente_temporal: cliente_id ? null : nombre_cliente_temporal || null,
    client_location: finalClientLocation,
    latitud: lat,
    longitud: lng,
    package_size: package_size,
    package_weight: package_weight,
    status: aiSuggestions ? estadoEnvioEnum.Values.suggested : estadoEnvioEnum.Values.pending,
    suggested_options: aiSuggestions ? aiSuggestions.suggestedOptions : null,
    reasoning: aiSuggestions ? aiSuggestions.reasoning : null,
  };

  try {
    const { data: newShipment, error } = await supabase
      .from("envios")
      .insert(shipmentData)
      .select()
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Supabase error object while inserting shipment:", JSON.stringify(pgError, null, 2));
      let errorMessage = "No se pudo registrar el envío.";
      if (pgError.message) {
          errorMessage = pgError.message;
      }
      return { success: false, error: errorMessage, data: null, info: geocodingInfo };
    }

    revalidatePath("/envios");
    revalidatePath("/envios/nuevo");
    revalidatePath("/mapa-envios");
    return { success: true, data: newShipment, error: null, info: geocodingInfo };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in createShipmentAction:", err);
    return {
      success: false,
      error: err.message || 'Error desconocido del servidor al crear el envío.',
      data: null,
      info: geocodingInfo,
    };
  }
}

export async function getClientesForShipmentFormAction(): Promise<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'email' | 'direccion'>[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, apellido, email, direccion")
      .eq("estado", true) 
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error fetching clients for shipment form:", error);
      return [];
    }
    return data || [];
}

export async function getEnvioByIdAction(envioId: string): Promise<{ data: EnvioConCliente | null; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("envios")
      .select("*, clientes (id, nombre, apellido, direccion, email, latitud, longitud)") 
      .eq("id", envioId)
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      if (pgError.code === 'PGRST116') return { data: null, error: "Envío no encontrado." };
      return { data: null, error: pgError.message || "Error al obtener datos del envío." };
    }
    return { data: data as EnvioConCliente, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { data: null, error: err.message || "Error desconocido del servidor." };
  }
}

export async function updateShipmentAction(
  envioId: string,
  formData: ShipmentFormData
): Promise<{ success: boolean; error?: string | null; data?: EnvioConCliente | null; info?: string | null }> {
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

  const { cliente_id, nombre_cliente_temporal, client_location, package_size, package_weight, status } = validatedFields.data;
  
  const updateData: Partial<UpdateEnvio> = {
    package_size,
    package_weight,
    status: status || undefined, // Only include status if it's provided
  };

  if (cliente_id) {
    updateData.cliente_id = cliente_id;
    updateData.nombre_cliente_temporal = null;
    const { data: clientData, error: clientError } = await supabase
      .from('clientes')
      .select('direccion, latitud, longitud')
      .eq('id', cliente_id)
      .single();
    if (clientError || !clientData) {
      geocodingInfo = "Error al obtener datos del cliente seleccionado. La ubicación podría no actualizarse.";
      updateData.client_location = client_location || undefined; // Keep existing or form-provided if client fetch fails
    } else {
      updateData.client_location = clientData.direccion || client_location || undefined;
      updateData.latitud = clientData.latitud;
      updateData.longitud = clientData.longitud;
      geocodingInfo = clientData.latitud ? "Ubicación y coordenadas actualizadas según el cliente." : (clientData.direccion ? "Ubicación actualizada según el cliente (sin geocodificación previa)." : null);
    }
  } else {
    updateData.cliente_id = null;
    updateData.nombre_cliente_temporal = nombre_cliente_temporal || null;
    updateData.client_location = client_location || undefined;
    if (client_location) {
      const coords = await geocodeAddressInMarDelPlata(client_location);
      if (coords) {
        updateData.latitud = coords.lat;
        updateData.longitud = coords.lng;
        geocodingInfo = "Dirección geocodificada exitosamente.";
      } else {
        updateData.latitud = null;
        updateData.longitud = null;
        geocodingInfo = "No se pudo geocodificar la dirección o está fuera de Mar del Plata. Coordenadas no guardadas.";
      }
    } else {
      updateData.latitud = null;
      updateData.longitud = null;
    }
  }

  try {
    const { data: updatedShipment, error } = await supabase
      .from("envios")
      .update(updateData)
      .eq("id", envioId)
      .select("*, clientes (id, nombre, apellido, direccion, email, latitud, longitud)")
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Supabase error updating shipment:", JSON.stringify(pgError, null, 2));
      return { success: false, error: pgError.message || "No se pudo actualizar el envío.", data: null, info: geocodingInfo };
    }

    revalidatePath("/envios");
    revalidatePath(`/envios/${envioId}`); // Assuming you might have a detail page
    revalidatePath(`/repartos`); // Revalidate repartos list as shipment status might affect them
    if (updatedShipment?.reparto_id) {
      revalidatePath(`/repartos/${updatedShipment.reparto_id}`);
    }
     revalidatePath("/mapa-envios");


    return { success: true, data: updatedShipment as EnvioConCliente, error: null, info: geocodingInfo };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in updateShipmentAction:", err);
    return {
      success: false,
      error: err.message || 'Error desconocido del servidor al actualizar el envío.',
      data: null,
      info: geocodingInfo,
    };
  }
}


export async function getEnviosAction(page = 1, pageSize = 10, searchTerm?: string): Promise<{ data: EnvioConCliente[]; count: number; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("envios")
      .select("*, clientes (id, nombre, apellido, direccion, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (searchTerm) {
      const searchConditions = [
        `client_location.ilike.%${searchTerm}%`,
        `nombre_cliente_temporal.ilike.%${searchTerm}%`,
        `status.ilike.%${searchTerm}%`
      ];
      query = query.or(searchConditions.join(','));
    }

    const { data, error, count } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Supabase error object while fetching envios:", JSON.stringify(pgError, null, 2));
      let errorMessage = "Ocurrió un error al cargar los envíos.";
      if (pgError.message) {
        errorMessage = pgError.message;
      }
      return { data: [], count: 0, error: errorMessage };
    }
    return { data: (data as EnvioConCliente[]) || [], count: count || 0, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEnviosAction:", err);
    return { data: [], count: 0, error: err.message || 'Error desconocido del servidor al obtener envíos.' };
  }
}
