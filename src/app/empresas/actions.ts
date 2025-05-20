
"use server";

import { revalidatePath } from "next/cache";
import type { EmpresaFormData } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { empresaSchema } from "@/lib/schemas";
import type { Empresa, NuevaEmpresa } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";


export async function addEmpresaAction(
  data: EmpresaFormData
): Promise<{ success: boolean; error?: string | null; data?: Empresa | null }> {
  const supabase = createSupabaseServerClient();

  const processedData: NuevaEmpresa = { 
    ...data,
    direccion: data.direccion === "" ? null : data.direccion,
    telefono: data.telefono === "" ? null : data.telefono,
    email: data.email === "" ? null : data.email,
    notas: data.notas === "" ? null : data.notas,
    estado: data.estado === undefined ? true : data.estado, // Ensure estado is set
  };

  const validatedFields = empresaSchema.safeParse(processedData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
      data: null,
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
        errorMessage = "Error de conexión o configuración con Supabase al guardar. Por favor, verifique las variables de entorno y las políticas RLS.";
      } else {
        errorMessage = `Error inesperado al guardar: ${JSON.stringify(pgError)}`;
      }
    return { success: false, error: errorMessage, data: null };
  }

  revalidatePath("/empresas");
  revalidatePath("/clientes"); 
  return { success: true, data: empresa, error: null };
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
      query = query.or(`nombre.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }
    
    const { data, error, count } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Supabase error object while fetching empresas:", JSON.stringify(pgError, null, 2));
      let errorMessage = "Ocurrió un error al cargar las empresas.";
      if (pgError.message) {
        errorMessage = pgError.message;
      } else if (Object.keys(pgError).length === 0 && typeof pgError === 'object') {
        errorMessage = "Error de conexión o configuración con Supabase. Por favor, verifique las variables de entorno y las políticas RLS si están activadas.";
      } else {
        errorMessage = `Error inesperado: ${JSON.stringify(pgError)}`;
      }
      return { data: [], count: 0, error: errorMessage };
    }
    return { data: data || [], count: count || 0, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEmpresasAction:", err.message);
    let detailedMessage = err.message || 'Error desconocido del servidor al obtener empresas.';
     if (err.message && err.message.includes("NEXT_PUBLIC_SUPABASE_URL") && err.message.includes("is missing")) {
        detailedMessage = "Error de configuración: Faltan las variables de entorno de Supabase en el servidor. Verifique NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."
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
      .eq("estado", true) // Only fetch active companies for selection
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
      .update({ estado: nuevoEstado })
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
