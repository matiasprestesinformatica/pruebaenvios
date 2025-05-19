
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RepartoCreationFormData } from "@/lib/schemas";
import { repartoCreationSchema } from "@/lib/schemas";
import type { Database, Reparto } from "@/types/supabase";

type Repartidores = Database['public']['Tables']['repartidores']['Row'];
type Empresas = Database['public']['Tables']['empresas']['Row'];
type Envios = Database['public']['Tables']['envios']['Row'];
type Clientes = Database['public']['Tables']['clientes']['Row'];


export async function getRepartidoresActivosAction(): Promise<Pick<Repartidores, 'id' | 'nombre'>[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("repartidores")
    .select("id, nombre")
    .eq("estado", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error fetching active repartidores:", error);
    return [];
  }
  return data || [];
}

export async function getEmpresasForRepartoAction(): Promise<Pick<Empresas, 'id' | 'nombre'>[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nombre")
    .order("nombre", { ascending: true });
  if (error) {
    console.error("Error fetching empresas for reparto:", error);
    return [];
  }
  return data || [];
}

export async function getEnviosPendientesAction(searchTerm?: string): Promise<(Envios & { clientes: Pick<Clientes, 'nombre' | 'apellido'> | null })[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("envios")
    .select("*, clientes (nombre, apellido)")
    .is("reparto_id", null) // Only envios not yet assigned to a reparto
    .eq("status", "pending"); // Only envios with status 'pending'

  if (searchTerm) {
    query = query.or(`client_location.ilike.%${searchTerm}%,nombre_cliente_temporal.ilike.%${searchTerm}%,clientes.nombre.ilike.%${searchTerm}%,clientes.apellido.ilike.%${searchTerm}%`);
  }
  
  query = query.order("created_at", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching pending envios:", error);
    return [];
  }
  return data || [];
}

export async function getEnviosPendientesPorEmpresaAction(empresaId: string): Promise<(Envios & { clientes: Pick<Clientes, 'id' | 'nombre' | 'apellido'> | null })[]> {
  const supabase = createSupabaseServerClient();

  // Step 1: Get client_ids for the given empresa_id
  const { data: clientesData, error: clientesError } = await supabase
    .from("clientes")
    .select("id")
    .eq("empresa_id", empresaId);

  if (clientesError) {
    console.error("Error fetching clients for empresa:", clientesError);
    return [];
  }
  if (!clientesData || clientesData.length === 0) {
    return []; // No clients for this company
  }
  const clientIds = clientesData.map(c => c.id);

  // Step 2: Get pending envios for these client_ids
  const { data: enviosData, error: enviosError } = await supabase
    .from("envios")
    .select("*, clientes (id, nombre, apellido)")
    .in("cliente_id", clientIds)
    .is("reparto_id", null)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  
  if (enviosError) {
    console.error("Error fetching pending envios for empresa's clients:", enviosError);
    return [];
  }
  return enviosData || [];
}

export async function createRepartoAction(
  formData: RepartoCreationFormData
): Promise<{ success: boolean; error?: string | null; data?: Reparto | null }> {
  const supabase = createSupabaseServerClient();

  const validatedFields = repartoCreationSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
    };
  }
  
  const { fecha_reparto, repartidor_id, tipo_reparto, empresa_id, envio_ids } = validatedFields.data;

  // Convert date to YYYY-MM-DD string for Supabase date type
  const fechaRepartoString = fecha_reparto.toISOString().split('T')[0];

  const repartoToInsert = {
    fecha_reparto: fechaRepartoString,
    repartidor_id,
    tipo_reparto,
    empresa_id: tipo_reparto === 'viaje_empresa' ? empresa_id : null,
    estado: 'asignado', // Default status
  };

  const { data: nuevoReparto, error: repartoError } = await supabase
    .from("repartos")
    .insert(repartoToInsert)
    .select()
    .single();

  if (repartoError) {
    console.error("Error creating reparto:", repartoError);
    return { success: false, error: `No se pudo crear el reparto: ${repartoError.message}` };
  }

  if (!nuevoReparto) {
    return { success: false, error: "No se pudo crear el reparto, no se obtuvo respuesta." };
  }

  // Update selected envios
  const { error: enviosError } = await supabase
    .from("envios")
    .update({ reparto_id: nuevoReparto.id, status: 'asignado_a_reparto' }) // Update status as well
    .in("id", envio_ids);

  if (enviosError) {
    // Note: Ideally, you'd roll back the reparto insertion here or use a transaction/RPC
    console.error("Error updating envios for reparto:", enviosError);
    return { success: false, error: `Reparto creado, pero falló la asignación de envíos: ${enviosError.message}. Considere usar una función RPC para atomicidad.` };
  }

  revalidatePath("/repartos");
  revalidatePath("/repartos/nuevo");
  revalidatePath("/envios"); // Envios list might change status
  return { success: true, data: nuevoReparto };
}

export async function getRepartosListAction(page = 1, pageSize = 10, searchTerm?: string) {
  const supabase = createSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("repartos")
    .select("*, repartidor:repartidores (id, nombre), empresa:empresas (id, nombre)", { count: "exact" })
    .order("fecha_reparto", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  
  // Add search logic if searchTerm is provided
  // For now, simple search by repartidor name or empresa name if type is viaje_empresa
  if (searchTerm) {
    // This search is very basic. For complex search, consider full-text search or more specific filters
    query = query.or(`repartidores.nombre.ilike.%${searchTerm}%,empresas.nombre.ilike.%${searchTerm}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching repartos list:", error);
    return { data: [], count: 0, error: error.message };
  }
  return { data: data || [], count: count || 0, error: null };
}

// Placeholder for getRepartoDetailsAction and updateRepartoStatusAction
// These would be needed for the /repartos/[id] page
export async function getRepartoDetailsAction(repartoId: string) {
  // TODO: Implement fetching reparto details and its associated envios
  console.warn(`getRepartoDetailsAction for ${repartoId} is not yet implemented.`);
  return { data: null, error: "Not implemented" };
}

export async function updateRepartoStatusAction(repartoId: string, nuevoEstado: string) {
  // TODO: Implement updating reparto status
  console.warn(`updateRepartoStatusAction for ${repartoId} to ${nuevoEstado} is not yet implemented.`);
  return { success: false, error: "Not implemented" };
}
