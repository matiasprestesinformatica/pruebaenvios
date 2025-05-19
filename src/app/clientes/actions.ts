
"use server";

import { revalidatePath } from "next/cache";
import type { ClientFormData } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/schemas";
import type { Cliente, Empresa, ClienteWithEmpresa } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

export async function addClientAction(
  data: ClientFormData
): Promise<{ success: boolean; error?: string | null; data?: Cliente | null }> {
  try {
    const supabase = createSupabaseServerClient();

    const validatedFields = clientSchema.safeParse(data);
    if (!validatedFields.success) {
      return {
        success: false,
        error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
        data: null,
      };
    }
    
    const { data: client, error: dbError } = await supabase
      .from("clientes")
      .insert(validatedFields.data)
      .select()
      .single();

    if (dbError) {
      const pgError = dbError as PostgrestError;
      console.error("Supabase error object while inserting client:", JSON.stringify(pgError, null, 2));
      
      let errorMessage = "No se pudo guardar el cliente.";
      if (pgError.code === '23505') {
          // Check if it's the email unique constraint
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
      return { success: false, error: errorMessage, data: null };
    }

    revalidatePath("/clientes"); 
    return { success: true, data: client, error: null };

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
      query = query.or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
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
      return [];
    }
    return data || [];
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEmpresasForClientFormAction:", err.message);
    throw err; 
  }
}
