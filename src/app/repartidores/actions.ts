
"use server";

import { revalidatePath } from "next/cache";
import type { RepartidorFormData } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { repartidorSchema } from "@/lib/schemas";
import type { Repartidor } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

export async function addRepartidorAction(
  data: RepartidorFormData
): Promise<{ success: boolean; error?: string | null; data?: Repartidor | null }> {
  const supabase = createSupabaseServerClient();

  const validatedFields = repartidorSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
    };
  }
  
  const { data: repartidor, error } = await supabase
    .from("repartidores")
    .insert(validatedFields.data)
    .select()
    .single();

  if (error) {
    const pgError = error as PostgrestError;
    console.error("Supabase error object while inserting repartidor:", JSON.stringify(pgError, null, 2));
    let errorMessage = "No se pudo guardar el repartidor.";
     if (pgError.message) {
        errorMessage = pgError.message;
      } else if (Object.keys(pgError).length === 0) {
        errorMessage = "Error de conexión o configuración con Supabase al guardar. Por favor, verifique las variables de entorno y las políticas RLS.";
      } else {
        errorMessage = `Error inesperado al guardar: ${JSON.stringify(pgError)}`;
      }
    return { success: false, error: errorMessage };
  }

  revalidatePath("/repartidores");
  return { success: true, data: repartidor };
}

export async function getRepartidoresAction(page = 1, pageSize = 10, searchTerm?: string) {
  const supabase = createSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("repartidores")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchTerm) {
    query = query.ilike("nombre", `%${searchTerm}%`);
  }
  
  const { data, error, count } = await query;

  if (error) {
    const pgError = error as PostgrestError;
    console.error("Supabase error object while fetching repartidores:", JSON.stringify(pgError, null, 2));
    let errorMessage = "Ocurrió un error al cargar los repartidores.";
    if (pgError.message) {
      errorMessage = pgError.message;
    } else if (Object.keys(pgError).length === 0) {
      errorMessage = "Error de conexión o configuración con Supabase. Por favor, verifique las variables de entorno y las políticas RLS si están activadas.";
    } else {
      errorMessage = `Error inesperado: ${JSON.stringify(pgError)}`;
    }
    return { data: [], count: 0, error: errorMessage };
  }
  return { data: data || [], count: count || 0, error: null };
}

export async function updateRepartidorEstadoAction(
  id: string,
  estado: boolean
): Promise<{ success: boolean; error?: string | null }> {
  const supabase = createSupabaseServerClient();
  
  const { error } = await supabase
    .from("repartidores")
    .update({ estado })
    .eq("id", id);

  if (error) {
    console.error("Error updating repartidor estado:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/repartidores");
  return { success: true };
}
