
"use server";

import { revalidatePath } from "next/cache";
import type { EmpresaFormData } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { empresaSchema } from "@/lib/schemas";
import type { Empresa } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";


export async function addEmpresaAction(
  data: EmpresaFormData
): Promise<{ success: boolean; error?: string | null; data?: Empresa | null }> {
  const supabase = createSupabaseServerClient();

  // Transform empty strings to null for optional fields
  const processedData = {
    ...data,
    direccion: data.direccion || null,
    telefono: data.telefono || null,
    email: data.email || null,
    notas: data.notas || null,
  };

  const validatedFields = empresaSchema.safeParse(processedData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
    };
  }
  
  const { data: empresa, error } = await supabase
    .from("empresas")
    .insert(validatedFields.data)
    .select()
    .single();

  if (error) {
    const pgError = error as PostgrestError;
    console.error("Supabase error object while inserting empresa:", JSON.stringify(pgError, null, 2));
    let errorMessage = "No se pudo guardar la empresa.";
     if (pgError.code === '23505' && pgError.constraint === 'empresas_email_key') {
        return { success: false, error: "Ya existe una empresa con este email." };
      }
      if (pgError.message) {
        errorMessage = pgError.message;
      } else if (Object.keys(pgError).length === 0) {
        errorMessage = "Error de conexión o configuración con Supabase al guardar. Por favor, verifique las variables de entorno y las políticas RLS.";
      } else {
        errorMessage = `Error inesperado al guardar: ${JSON.stringify(pgError)}`;
      }
    return { success: false, error: errorMessage };
  }

  revalidatePath("/empresas");
  revalidatePath("/clientes"); // Also revalidate clients in case new company is used in client form
  return { success: true, data: empresa };
}

export async function getEmpresasAction(page = 1, pageSize = 10, searchTerm?: string) {
  const supabase = createSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("empresas")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchTerm) {
    query = query.or(`nombre.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }
  
  const { data, error, count } = await query;

  if (error) {
    const pgError = error as PostgrestError;
    console.error("Supabase error object while fetching empresas:", JSON.stringify(pgError, null, 2));
    let errorMessage = "Ocurrió un error al cargar las empresas.";
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

export async function getEmpresasForSelectAction() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error fetching empresas for select:", error);
    return [];
  }
  return data || [];
}
