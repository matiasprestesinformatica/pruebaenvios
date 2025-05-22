
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TipoPaqueteFormData, TipoServicioFormData, ListaTarifasCalculadoraFormData, TarifaDistanciaCalculadoraFormData } from "@/lib/schemas";
import { tipoPaqueteSchema, tipoServicioSchema, listaTarifasCalculadoraSchema } from "@/lib/schemas";
import type { Database, TipoPaquete, NuevoTipoPaquete, UpdateTipoPaquete, TipoServicio, NuevoTipoServicio, UpdateTipoServicio, TipoCalculadoraServicioEnum, TarifaDistanciaCalculadora, NuevaTarifaDistanciaCalculadora } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { format } from 'date-fns';

// --- Tipos de Paquete Actions ---

export async function addTipoPaqueteAction(
  data: TipoPaqueteFormData
): Promise<{ success: boolean; error?: string | null; data?: TipoPaquete | null }> {
  const supabase = createSupabaseServerClient();
  const validatedFields = tipoPaqueteSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
      data: null,
    };
  }

  try {
    const { data: newTipoPaquete, error } = await supabase
      .from("tipos_paquete")
      .insert(validatedFields.data as NuevoTipoPaquete)
      .select()
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error adding tipo_paquete:", JSON.stringify(pgError, null, 2));
      let errorMessage = "No se pudo guardar el tipo de paquete.";
      if (pgError.code === '23505' && pgError.message.includes('tipos_paquete_nombre_key')) {
          errorMessage = "Ya existe un tipo de paquete con este nombre.";
      } else if (pgError.message) {
        errorMessage = pgError.message;
      }
      return { success: false, error: errorMessage, data: null };
    }
    revalidatePath("/configuracion");
    revalidatePath("/envios"); 
    revalidatePath("/envios/nuevo");
    return { success: true, data: newTipoPaquete, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err.message || "Error desconocido del servidor.", data: null };
  }
}

export async function getTiposPaqueteAction(
  page = 1,
  pageSize = 10,
  searchTerm?: string
): Promise<{ data: TipoPaquete[]; count: number; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("tipos_paquete")
      .select("*", { count: "exact" })
      .order("nombre", { ascending: true })
      .range(from, to);

    if (searchTerm) {
      query = query.or(`nombre.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      return { data: [], count: 0, error: pgError.message || "Error al cargar tipos de paquete." };
    }
    return { data: data || [], count: count || 0, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { data: [], count: 0, error: err.message || "Error desconocido del servidor." };
  }
}

export async function getTipoPaqueteByIdAction(id: string): Promise<{ data: TipoPaquete | null; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tipos_paquete")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      const pgError = error as PostgrestError;
       if (pgError.code === 'PGRST116') return { data: null, error: "Tipo de paquete no encontrado." };
      return { data: null, error: pgError.message || "Error al obtener tipo de paquete." };
    }
    return { data, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { data: null, error: err.message || "Error desconocido del servidor." };
  }
}

export async function updateTipoPaqueteAction(
  id: string,
  data: TipoPaqueteFormData
): Promise<{ success: boolean; error?: string | null; data?: TipoPaquete | null }> {
  const supabase = createSupabaseServerClient();
  const validatedFields = tipoPaqueteSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
      data: null,
    };
  }

  try {
    const { data: updatedTipoPaquete, error } = await supabase
      .from("tipos_paquete")
      .update(validatedFields.data as UpdateTipoPaquete)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error updating tipo_paquete:", JSON.stringify(pgError, null, 2));
      let errorMessage = "No se pudo actualizar el tipo de paquete.";
      if (pgError.code === '23505' && pgError.message.includes('tipos_paquete_nombre_key')) {
          errorMessage = "Ya existe otro tipo de paquete con este nombre.";
      } else if (pgError.message) {
        errorMessage = pgError.message;
      }
      return { success: false, error: errorMessage, data: null };
    }
    revalidatePath("/configuracion");
    revalidatePath("/envios"); 
    revalidatePath("/envios/nuevo");
    return { success: true, data: updatedTipoPaquete, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err.message || "Error desconocido del servidor.", data: null };
  }
}

export async function updateTipoPaqueteEstadoAction(
  id: string,
  activo: boolean
): Promise<{ success: boolean; error?: string | null }> {
  const supabase = createSupabaseServerClient();
  try {
    const { error } = await supabase
      .from("tipos_paquete")
      .update({ activo })
      .eq("id", id);

    if (error) {
      const pgError = error as PostgrestError;
      return { success: false, error: pgError.message || "Error al actualizar estado." };
    }
    revalidatePath("/configuracion");
    revalidatePath("/envios");
    revalidatePath("/envios/nuevo");
    return { success: true, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err.message || "Error desconocido del servidor." };
  }
}

export async function getTiposPaqueteActivosAction(): Promise<Pick<TipoPaquete, 'id' | 'nombre'>[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tipos_paquete")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching active tipos_paquete:", JSON.stringify(pgError, null, 2));
      return [];
    }
    return (data as Pick<TipoPaquete, 'id' | 'nombre'>[]) || [];
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getTiposPaqueteActivosAction:", err.message);
    return [];
  }
}


// --- Tipos de Servicio Actions ---

export async function addTipoServicioAction(
  data: TipoServicioFormData
): Promise<{ success: boolean; error?: string | null; data?: TipoServicio | null }> {
  const supabase = createSupabaseServerClient();
  const validatedFields = tipoServicioSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
      data: null,
    };
  }
  
  try {
    const { data: newTipoServicio, error } = await supabase
      .from("tipos_servicio")
      .insert(validatedFields.data as NuevoTipoServicio)
      .select()
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error adding tipo_servicio:", JSON.stringify(pgError, null, 2));
      let errorMessage = "No se pudo guardar el tipo de servicio.";
      if (pgError.code === '23505' && pgError.message.includes('tipos_servicio_nombre_key')) {
          errorMessage = "Ya existe un tipo de servicio con este nombre.";
      } else if (pgError.message) {
        errorMessage = pgError.message;
      }
      return { success: false, error: errorMessage, data: null };
    }
    revalidatePath("/configuracion");
    revalidatePath("/envios");
    revalidatePath("/envios/nuevo");
    return { success: true, data: newTipoServicio, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err.message || "Error desconocido del servidor.", data: null };
  }
}

export async function getTiposServicioAction(
  page = 1,
  pageSize = 10,
  searchTerm?: string
): Promise<{ data: TipoServicio[]; count: number; error: string | null }> {
   try {
    const supabase = createSupabaseServerClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("tipos_servicio")
      .select("*", { count: "exact" })
      .order("nombre", { ascending: true })
      .range(from, to);

    if (searchTerm) {
      query = query.or(`nombre.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      return { data: [], count: 0, error: pgError.message || "Error al cargar tipos de servicio." };
    }
    return { data: data || [], count: count || 0, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { data: [], count: 0, error: err.message || "Error desconocido del servidor." };
  }
}

export async function getTipoServicioByIdAction(id: string): Promise<{ data: TipoServicio | null; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tipos_servicio")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      const pgError = error as PostgrestError;
       if (pgError.code === 'PGRST116') return { data: null, error: "Tipo de servicio no encontrado." };
      return { data: null, error: pgError.message || "Error al obtener tipo de servicio." };
    }
    return { data, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { data: null, error: err.message || "Error desconocido del servidor." };
  }
}

export async function updateTipoServicioAction(
  id: string,
  data: TipoServicioFormData
): Promise<{ success: boolean; error?: string | null; data?: TipoServicio | null }> {
  const supabase = createSupabaseServerClient();
  const validatedFields = tipoServicioSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
      data: null,
    };
  }
  
  try {
    const { data: updatedTipoServicio, error } = await supabase
      .from("tipos_servicio")
      .update(validatedFields.data as UpdateTipoServicio)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error updating tipo_servicio:", JSON.stringify(pgError, null, 2));
      let errorMessage = "No se pudo actualizar el tipo de servicio.";
      if (pgError.code === '23505' && pgError.message.includes('tipos_servicio_nombre_key')) {
          errorMessage = "Ya existe otro tipo de servicio con este nombre.";
      } else if (pgError.message) {
        errorMessage = pgError.message;
      }
      return { success: false, error: errorMessage, data: null };
    }
    revalidatePath("/configuracion");
    revalidatePath("/envios"); 
    revalidatePath("/envios/nuevo");
    return { success: true, data: updatedTipoServicio, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err.message || "Error desconocido del servidor.", data: null };
  }
}

export async function updateTipoServicioEstadoAction(
  id: string,
  activo: boolean
): Promise<{ success: boolean; error?: string | null }> {
  const supabase = createSupabaseServerClient();
  try {
    const { error } = await supabase
      .from("tipos_servicio")
      .update({ activo })
      .eq("id", id);

    if (error) {
      const pgError = error as PostgrestError;
      return { success: false, error: pgError.message || "Error al actualizar estado." };
    }
    revalidatePath("/configuracion");
    revalidatePath("/envios");
    revalidatePath("/envios/nuevo");
    return { success: true, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err.message || "Error desconocido del servidor." };
  }
}

export async function getTiposServicioActivosAction(): Promise<Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tipos_servicio")
      .select("id, nombre, precio_base")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching active tipos_servicio:", JSON.stringify(pgError, null, 2));
      return [];
    }
    return (data as Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[]) || [];
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getTiposServicioActivosAction:", err.message);
    return [];
  }
}


// --- Tarifas Distancia Calculadora Actions ---

export async function getTarifasCalculadoraConHistorialAction(
  tipo: TipoCalculadoraServicioEnum
): Promise<{ data: Record<string, TarifaDistanciaCalculadora[]>; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('tarifas_distancia_calculadora')
      .select('*')
      .eq('tipo_calculadora', tipo)
      .order('fecha_vigencia_desde', { ascending: false })
      .order('distancia_hasta_km', { ascending: true });

    if (error) {
      const pgError = error as PostgrestError;
      console.error(`Error fetching tariffs history for ${tipo}:`, pgError);
      return { data: {}, error: `Error al obtener historial de tarifas: ${pgError.message}` };
    }

    const agrupadas: Record<string, TarifaDistanciaCalculadora[]> = {};
    (data || []).forEach(tarifa => {
      const fechaKey = tarifa.fecha_vigencia_desde; // Direct string key
      if (!agrupadas[fechaKey]) {
        agrupadas[fechaKey] = [];
      }
      agrupadas[fechaKey].push(tarifa);
    });

    return { data: agrupadas, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error(`Unexpected error in getTarifasCalculadoraConHistorialAction for ${tipo}:`, err);
    return { data: {}, error: err.message || "Error desconocido del servidor al obtener historial de tarifas." };
  }
}

export async function saveListaTarifasCalculadoraAction(
  tipo: TipoCalculadoraServicioEnum,
  fechaVigenciaDate: Date, // Changed to Date
  tarifas: TarifaDistanciaCalculadoraFormData[]
): Promise<{ success: boolean; error?: string | null }> {
  const supabase = createSupabaseServerClient();
  
  const fechaVigenciaString = format(fechaVigenciaDate, 'yyyy-MM-dd');

  // Validate the whole list
  const validatedSchema = listaTarifasCalculadoraSchema.safeParse({ fecha_vigencia_desde: fechaVigenciaDate, tarifas });
  if (!validatedSchema.success) {
    return { success: false, error: "Error de validación: " + JSON.stringify(validatedSchema.error.flatten().fieldErrors) };
  }

  // Delete existing tariffs for this type and date
  const { error: deleteError } = await supabase
    .from('tarifas_distancia_calculadora')
    .delete()
    .eq('tipo_calculadora', tipo)
    .eq('fecha_vigencia_desde', fechaVigenciaString);

  if (deleteError) {
    const pgDeleteError = deleteError as PostgrestError;
    console.error(`Error deleting existing tariffs for ${tipo} on ${fechaVigenciaString}:`, pgDeleteError);
    return { success: false, error: `Error al limpiar tarifas existentes: ${pgDeleteError.message}` };
  }

  // Insert new tariffs
  const tarifasParaInsertar: NuevaTarifaDistanciaCalculadora[] = tarifas.map(t => ({
    tipo_calculadora: tipo,
    fecha_vigencia_desde: fechaVigenciaString,
    distancia_hasta_km: t.distancia_hasta_km,
    precio: t.precio,
  }));

  if (tarifasParaInsertar.length > 0) {
    const { error: insertError } = await supabase
      .from('tarifas_distancia_calculadora')
      .insert(tarifasParaInsertar);

    if (insertError) {
      const pgInsertError = insertError as PostgrestError;
      console.error(`Error inserting new tariffs for ${tipo} on ${fechaVigenciaString}:`, pgInsertError);
      return { success: false, error: `Error al guardar nuevas tarifas: ${pgInsertError.message}` };
    }
  }

  revalidatePath('/configuracion');
  revalidatePath('/cotizador-envios-express'); // Revalidate calculator pages
  revalidatePath('/cotizador-envios-lowcost');
  return { success: true, error: null };
}


export async function deleteTarifasCalculadoraPorFechaAction(
  tipo: TipoCalculadoraServicioEnum,
  fechaVigencia: string 
): Promise<{ success: boolean; error?: string | null }> {
  const supabase = createSupabaseServerClient();
  try {
    const { error } = await supabase
      .from('tarifas_distancia_calculadora')
      .delete()
      .eq('tipo_calculadora', tipo)
      .eq('fecha_vigencia_desde', fechaVigencia);

    if (error) {
      const pgError = error as PostgrestError;
      console.error(`Error deleting tariffs for ${tipo} on ${fechaVigencia}:`, pgError);
      return { success: false, error: `Error al eliminar lista de tarifas: ${pgError.message}` };
    }
    revalidatePath('/configuracion');
    revalidatePath('/cotizador-envios-express');
    revalidatePath('/cotizador-envios-lowcost');
    return { success: true, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error(`Unexpected error in deleteTarifasCalculadoraPorFechaAction for ${tipo} on ${fechaVigencia}:`, err);
    return { success: false, error: err.message || "Error desconocido al eliminar lista de tarifas." };
  }
}
