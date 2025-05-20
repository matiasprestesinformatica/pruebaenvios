
"use server";

import { revalidatePath } from "next/cache";
import type { EmpresaFormData } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { empresaSchema } from "@/lib/schemas";
import type { Empresa, NuevaEmpresa, UpdateEmpresa } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

// Helper function to geocode address and validate if it's in Mar del Plata
async function geocodeAddressInMarDelPlata(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_GEOCODING_API_KEY is not set. Geocoding will be skipped for empresa.");
    return null;
  }

  const encodedAddress = encodeURIComponent(address);
  const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&components=locality:Mar%20del%20Plata|administrative_area:Buenos%20Aires|country:AR`;

  try {
    const response = await fetch(geocodingUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      // const addressComponents = data.results[0].address_components; // Keep for debugging

      // Primary validation: check if coordinates fall within Mar del Plata bounds
      const MDP_BOUNDS = {
        minLat: -38.15, maxLat: -37.90,
        minLng: -57.70, maxLng: -57.45,
      };

      if (location.lat >= MDP_BOUNDS.minLat && location.lat <= MDP_BOUNDS.maxLat &&
          location.lng >= MDP_BOUNDS.minLng && location.lng <= MDP_BOUNDS.maxLng) {
        return { lat: location.lat, lng: location.lng };
      } else {
        console.warn(`Geocoded address for empresa "${address}" is outside Mar del Plata bounds. Coordinates: Lat ${location.lat}, Lng ${location.lng}`);
        return null;
      }
    } else {
      console.warn(`Geocoding failed for empresa address "${address}": ${data.status}`, data.error_message || '');
      return null;
    }
  } catch (error) {
    console.error("Error calling Geocoding API for empresa:", error);
    return null;
  }
}


export async function addEmpresaAction(
  data: EmpresaFormData
): Promise<{ success: boolean; error?: string | null; data?: Empresa | null, info?: string | null }> {
  let geocodingInfo: string | null = null;
  try {
    const supabase = createSupabaseServerClient();

    let coordinates: { lat: number; lng: number } | null = null;
    if (data.direccion) { // Dirección is now required by the schema
      coordinates = await geocodeAddressInMarDelPlata(data.direccion);
      if (coordinates) {
        geocodingInfo = "Dirección de empresa geocodificada y validada en Mar del Plata.";
      } else {
        geocodingInfo = "No se pudo geocodificar la dirección de la empresa o está fuera de Mar del Plata. Coordenadas no guardadas.";
      }
    }

    const processedData: Partial<NuevaEmpresa> = { 
      ...data,
      latitud: coordinates?.lat ?? null,
      longitud: coordinates?.lng ?? null,
      telefono: data.telefono === "" || data.telefono === null ? null : data.telefono,
      email: data.email === "" || data.email === null ? null : data.email,
      notas: data.notas === "" || data.notas === null ? null : data.notas,
      estado: data.estado === undefined ? true : data.estado,
    };
    
    const validatedFields = empresaSchema.safeParse(processedData);
    if (!validatedFields.success) {
      return {
        success: false,
        error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
        data: null,
        info: geocodingInfo,
      };
    }
    
    const { data: empresa, error } = await supabase
      .from("empresas")
      .insert(validatedFields.data as NuevaEmpresa) 
      .select()
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Supabase error object while inserting empresa:", JSON.stringify(pgError, null, 2));
      let errorMessage = "No se pudo guardar la empresa.";
      if (pgError.code === '23505' && pgError.constraint === 'empresas_email_key') {
          errorMessage = "Ya existe una empresa con este email.";
      } else if (pgError.message) {
          errorMessage = pgError.message;
      } else if (Object.keys(pgError).length === 0 && typeof pgError === 'object') {
        errorMessage = "Error de conexión o configuración con Supabase al guardar empresa. Por favor, verifique las variables de entorno y las políticas RLS.";
      } else {
        errorMessage = `Error inesperado al guardar empresa: ${JSON.stringify(pgError)}`;
      }
      return { success: false, error: errorMessage, data: null, info: geocodingInfo };
    }

    revalidatePath("/empresas");
    revalidatePath("/clientes"); 
    return { success: true, data: empresa, error: null, info: geocodingInfo };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in addEmpresaAction:", err);
    let detailedMessage = err.message || 'Error desconocido del servidor al agregar empresa.';
    if (err.message && err.message.includes("NEXT_PUBLIC_SUPABASE_URL") && err.message.includes("is missing")) {
        detailedMessage = "Error de configuración: Faltan las variables de entorno de Supabase en el servidor."
    }
    return {
      success: false,
      error: detailedMessage,
      data: null,
      info: geocodingInfo,
    };
  }
}

export async function getEmpresasAction(page = 1, pageSize = 10, searchTerm?: string): Promise<{data: Empresa[], count: number, error: string | null}> {
  try {
    const supabase = createSupabaseServerClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("empresas")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (searchTerm) {
      query = query.or(`nombre.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,direccion.ilike.%${searchTerm}%`);
    }
    
    const { data, error, count } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Supabase error object while fetching empresas:", JSON.stringify(pgError, null, 2));
      let errorMessage = "Ocurrió un error al cargar las empresas.";
      if (pgError.message) {
        errorMessage = pgError.message;
      } else if (Object.keys(pgError).length === 0 && typeof pgError === 'object') {
        errorMessage = "Error de conexión o configuración con Supabase al obtener empresas. Por favor, verifique las variables de entorno y las políticas RLS si están activadas.";
      } else {
        errorMessage = `Error inesperado al obtener empresas: ${JSON.stringify(pgError)}`;
      }
      return { data: [], count: 0, error: errorMessage };
    }
    return { data: data || [], count: count || 0, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEmpresasAction:", err.message);
    let detailedMessage = err.message || 'Error desconocido del servidor al obtener empresas.';
     if (err.message && err.message.includes("NEXT_PUBLIC_SUPABASE_URL") && err.message.includes("is missing")) {
        detailedMessage = "Error de configuración: Faltan las variables de entorno de Supabase en el servidor."
    }
    return { data: [], count: 0, error: detailedMessage };
  }
}

export async function getEmpresasForSelectAction(): Promise<Pick<Empresa, 'id' | 'nombre'>[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("empresas")
      .select("id, nombre")
      .eq("estado", true)
      .order("nombre", { ascending: true });

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching empresas for select:", JSON.stringify(pgError, null, 2));
      return [];
    }
    return data || [];
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEmpresasForSelectAction:", err.message);
    return []; 
  }
}

export async function updateEmpresaEstadoAction(
  empresaId: string,
  nuevoEstado: boolean
): Promise<{ success: boolean; error?: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("empresas")
      .update({ estado: nuevoEstado } as UpdateEmpresa) 
      .eq("id", empresaId);

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error updating empresa estado:", JSON.stringify(pgError, null, 2));
      let errorMessage = "No se pudo actualizar el estado de la empresa.";
      if (pgError.message) {
        errorMessage = pgError.message;
      }
      return { success: false, error: errorMessage };
    }

    revalidatePath("/empresas");
    return { success: true };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in updateEmpresaEstadoAction:", err.message);
    return { success: false, error: err.message || "Error desconocido del servidor." };
  }
}
