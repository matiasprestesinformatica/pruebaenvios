
"use server";

import { revalidatePath } from "next/cache";
import type { ClientFormData } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/schemas";

export async function addClientAction(
  data: ClientFormData
): Promise<{ success: boolean; error?: string | null; data?: any }> {
  const supabase = createSupabaseServerClient();

  const validatedFields = clientSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
    };
  }
  
  const { data: client, error } = await supabase
    .from("clientes")
    .insert(validatedFields.data)
    .select()
    .single();

  if (error) {
    console.error("Supabase error object while inserting client:", JSON.stringify(error, null, 2));
    
    let errorMessage = "No se pudo guardar el cliente.";
    // Check for unique constraint violation (e.g., email)
    if (typeof error === 'object' && error !== null && (error as any).code === '23505') {
        return { success: false, error: "Ya existe un cliente con este email." };
    }

    if (typeof error === 'object' && error !== null) {
      if ((error as any).message) {
        errorMessage = (error as any).message;
      } else if (Object.keys(error).length === 0) {
        errorMessage = "Error de conexión o configuración con Supabase al guardar. Por favor, verifique las variables de entorno (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) y las políticas RLS.";
      } else {
        errorMessage = `Error inesperado al guardar: ${JSON.stringify(error)}`;
      }
    }
    return { success: false, error: errorMessage };
  }

  revalidatePath("/clientes"); // Revalidate the clients page to show the new client
  return { success: true, data: client };
}

export async function getClientsAction(page = 1, pageSize = 10, searchTerm?: string) {
  const supabase = createSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("clientes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchTerm) {
    query = query.or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }
  
  const { data, error, count } = await query;

  if (error) {
    // Log the full error object for better server-side debugging
    console.error("Supabase error object while fetching clients:", JSON.stringify(error, null, 2));
    
    let errorMessage = "Ocurrió un error al cargar los clientes.";
    if (typeof error === 'object' && error !== null) {
      if ((error as any).message) {
        errorMessage = (error as any).message;
      } else if (Object.keys(error).length === 0) {
        // This specifically handles the case where error is {}
        errorMessage = "Error de conexión o configuración con Supabase. Por favor, verifique las variables de entorno (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) y las políticas RLS si están activadas.";
      } else {
        // Fallback for other types of error objects
        errorMessage = `Error inesperado: ${JSON.stringify(error)}`;
      }
    }
    return { data: [], count: 0, error: errorMessage };
  }
  return { data: data || [], count: count || 0, error: null };
}
