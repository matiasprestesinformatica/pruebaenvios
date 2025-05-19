
"use server";

import { revalidatePath } from "next/cache";
import type { ClientFormData } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/schemas";
import type { Cliente } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

export async function addClientAction(
  data: ClientFormData
): Promise<{ success: boolean; error?: string | null; data?: Cliente | null }> {
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
    const pgError = error as PostgrestError;
    console.error("Supabase error object while inserting client:", JSON.stringify(pgError, null, 2));
    
    let errorMessage = "No se pudo guardar el cliente.";
    if (pgError.code === '23505') {
        // Check if it's the email unique constraint
        if (pgError.constraint === 'clientes_email_key') {
            return { success: false, error: "Ya existe un cliente con este email." };
        }
    }

    if (pgError.message) {
      errorMessage = pgError.message;
    } else if (Object.keys(pgError).length === 0) {
      errorMessage = "Error de conexión o configuración con Supabase al guardar. Por favor, verifique las variables de entorno (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) y las políticas RLS.";
    } else {
      errorMessage = `Error inesperado al guardar: ${JSON.stringify(pgError)}`;
    }
    return { success: false, error: errorMessage };
  }

  revalidatePath("/clientes"); 
  return { success: true, data: client };
}

export async function getClientsAction(page = 1, pageSize = 10, searchTerm?: string) {
  const supabase = createSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("clientes")
    .select("*, empresa:empresas (id, nombre)", { count: "exact" }) 
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchTerm) {
    query = query.or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }
  
  const { data, error, count } = await query;

  if (error) {
    const pgError = error as PostgrestError;
    console.error("Supabase error object while fetching clients:", JSON.stringify(pgError, null, 2));
    
    let errorMessage = "Ocurrió un error al cargar los clientes.";
    if (pgError.message) {
      errorMessage = pgError.message;
    } else if (Object.keys(pgError).length === 0) {
      errorMessage = "Error de conexión o configuración con Supabase. Por favor, verifique las variables de entorno (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) y las políticas RLS si están activadas.";
    } else {
      errorMessage = `Error inesperado: ${JSON.stringify(pgError)}`;
    }
    return { data: [], count: 0, error: errorMessage };
  }
  return { data: data || [], count: count || 0, error: null };
}

export async function getEmpresasForClientFormAction() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error fetching empresas for client form:", error);
    return [];
  }
  return data || [];
}
