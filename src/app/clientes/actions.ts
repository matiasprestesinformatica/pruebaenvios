
"use server";

import { revalidatePath } from "next/cache";
import type { ClientFormData } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/schemas";
import type { Cliente, Empresa, ClienteWithEmpresa, NuevoCliente } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

// Helper function to geocode address and validate if it's in Mar del Plata
async function geocodeAddressInMarDelPlata(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_GEOCODING_API_KEY is not set. Geocoding will be skipped.");
    return null;
  }

  // Component filtering biases results to Mar del Plata, Argentina
  const encodedAddress = encodeURIComponent(address);
  const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&components=locality:Mar%20del%20Plata|administrative_area:Buenos%20Aires|country:AR`;

  try {
    const response = await fetch(geocodingUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location; // { lat, lng }
      const addressComponents = data.results[0].address_components;

      // Basic check: Is it in Mar del Plata and Buenos Aires Province?
      const isMarDelPlata = addressComponents.some(
        (component: any) => 
          (component.types.includes('locality') && component.long_name.toLowerCase().includes('mar del plata')) ||
          (component.types.includes('administrative_area_level_1') && component.long_name.toLowerCase().includes('buenos aires')) 
      );
      
      // More precise bounding box check (approximate for Mar del Plata)
      const MDP_BOUNDS = {
        minLat: -38.15, maxLat: -37.90,
        minLng: -57.70, maxLng: -57.45,
      };

      if (isMarDelPlata && 
          location.lat >= MDP_BOUNDS.minLat && location.lat <= MDP_BOUNDS.maxLat &&
          location.lng >= MDP_BOUNDS.minLng && location.lng <= MDP_BOUNDS.maxLng) {
        return { lat: location.lat, lng: location.lng };
      } else {
        console.warn(`Geocoded address for "${address}" is outside Mar del Plata or components do not match.`);
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


export async function addClientAction(
  data: ClientFormData
): Promise<{ success: boolean; error?: string | null; data?: Cliente | null, info?: string | null }> {
  let geocodingInfo: string | null = null;
  try {
    const supabase = createSupabaseServerClient();

    const processedData: Partial<NuevoCliente> = { // Use Partial<NuevoCliente> to build up the object
      ...data,
      notas: data.notas === "" || data.notas === null ? null : data.notas,
      empresa_id: data.empresa_id === "" || data.empresa_id === null ? null : data.empresa_id,
    };
    
    // Geocode address if provided
    if (data.direccion) {
      const coordinates = await geocodeAddressInMarDelPlata(data.direccion);
      if (coordinates) {
        processedData.latitud = coordinates.lat;
        processedData.longitud = coordinates.lng;
        geocodingInfo = "Dirección geocodificada y validada en Mar del Plata.";
      } else {
        processedData.latitud = null;
        processedData.longitud = null;
        geocodingInfo = "No se pudo geocodificar la dirección o está fuera de Mar del Plata. Coordenadas no guardadas.";
      }
    }


    const validatedFields = clientSchema.safeParse(processedData);
    if (!validatedFields.success) {
      return {
        success: false,
        error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
        data: null,
        info: geocodingInfo,
      };
    }
    
    const { data: client, error: dbError } = await supabase
      .from("clientes")
      .insert(validatedFields.data as NuevoCliente) // Cast to NuevoCliente after validation
      .select()
      .single();

    if (dbError) {
      const pgError = dbError as PostgrestError;
      console.error("Supabase error object while inserting client:", JSON.stringify(pgError, null, 2));
      
      let errorMessage = "No se pudo guardar el cliente.";
      if (pgError.code === '23505') {
          if (pgError.constraint === 'clientes_email_key') {
              errorMessage = "Ya existe un cliente con este email.";
          }
      } else if (pgError.message) {
        errorMessage = pgError.message;
      } else if (Object.keys(pgError).length === 0 && typeof pgError === 'object') { 
        errorMessage = "Error de conexión o configuración con Supabase al guardar. Por favor, verifique las variables de entorno y las políticas RLS.";
      } else {
        errorMessage = `Error inesperado al guardar: ${JSON.stringify(pgError)}`;
      }
      return { success: false, error: errorMessage, data: null, info: geocodingInfo };
    }

    revalidatePath("/clientes"); 
    return { success: true, data: client, error: null, info: geocodingInfo };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in addClientAction:", err);
    let detailedMessage = err.message || 'Error desconocido del servidor.';
    if (err.message && err.message.includes("NEXT_PUBLIC_SUPABASE_URL") && err.message.includes("is missing")) {
        detailedMessage = "Error de configuración: Faltan las variables de entorno de Supabase en el servidor. Verifique NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."
    }
    return {
      success: false,
      error: detailedMessage,
      data: null,
      info: geocodingInfo
    };
  }
}

export async function getClientsAction(page = 1, pageSize = 10, searchTerm?: string): Promise<{ data: ClienteWithEmpresa[]; count: number; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("clientes")
      .select("*, empresa:empresas (id, nombre)", { count: "exact" }) 
      .order("created_at", { ascending: false })
      .range(from, to);

    if (searchTerm) {
      query = query.or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,empresa:empresas.nombre.ilike.%${searchTerm}%`);
    }
    
    const { data, error, count } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Supabase error object while fetching clients:", JSON.stringify(pgError, null, 2));
      
      let errorMessage = "Ocurrió un error al cargar los clientes.";
      if (pgError.message) {
        errorMessage = pgError.message;
      } else if (Object.keys(pgError).length === 0 && typeof pgError === 'object') {
        errorMessage = "Error de conexión o configuración con Supabase. Por favor, verifique las variables de entorno y las políticas RLS si están activadas.";
      } else {
        errorMessage = `Error inesperado: ${JSON.stringify(pgError)}`;
      }
      return { data: [], count: 0, error: errorMessage };
    }
    return { data: (data as ClienteWithEmpresa[]) || [], count: count || 0, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getClientsAction:", err);
    let detailedMessage = err.message || 'Error desconocido del servidor al obtener clientes.';
     if (err.message && err.message.includes("NEXT_PUBLIC_SUPABASE_URL") && err.message.includes("is missing")) {
        detailedMessage = "Error de configuración: Faltan las variables de entorno de Supabase en el servidor. Verifique NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."
    }
    return { data: [], count: 0, error: detailedMessage };
  }
}

export async function getEmpresasForClientFormAction(): Promise<Pick<Empresa, 'id' | 'nombre'>[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("empresas")
      .select("id, nombre")
      .order("nombre", { ascending: true });

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching empresas for client form:", JSON.stringify(pgError, null, 2));
      return []; // Return empty array on error, dialog will show toast
    }
    return data || [];
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEmpresasForClientFormAction:", err.message);
    throw err; 
  }
}
