
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RepartoCreationFormData, EstadoReparto } from "@/lib/schemas";
import { repartoCreationSchema, estadoRepartoEnum, estadoEnvioEnum } from "@/lib/schemas";
import type { Database, Reparto, RepartoConDetalles, EnvioConCliente, RepartoCompleto } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";


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

export async function getEnviosPendientesAction(searchTerm?: string): Promise<EnvioConCliente[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("envios")
    .select("*, clientes (id, nombre, apellido, direccion, email)")
    .is("reparto_id", null) 
    .eq("status", estadoEnvioEnum.Values.pending); 

  if (searchTerm) {
    query = query.or(`client_location.ilike.%${searchTerm}%,nombre_cliente_temporal.ilike.%${searchTerm}%,clientes.nombre.ilike.%${searchTerm}%,clientes.apellido.ilike.%${searchTerm}%`);
  }
  
  query = query.order("created_at", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching pending envios:", error);
    return [];
  }
  return data as EnvioConCliente[] || [];
}

export async function getEnviosPendientesPorEmpresaAction(empresaId: string): Promise<EnvioConCliente[]> {
  const supabase = createSupabaseServerClient();

  const { data: clientesData, error: clientesError } = await supabase
    .from("clientes")
    .select("id")
    .eq("empresa_id", empresaId);

  if (clientesError) {
    console.error("Error fetching clients for empresa:", clientesError);
    return [];
  }
  if (!clientesData || clientesData.length === 0) {
    return []; 
  }
  const clientIds = clientesData.map(c => c.id);

  const { data: enviosData, error: enviosError } = await supabase
    .from("envios")
    .select("*, clientes (id, nombre, apellido, direccion, email)")
    .in("cliente_id", clientIds)
    .is("reparto_id", null)
    .eq("status", estadoEnvioEnum.Values.pending)
    .order("created_at", { ascending: true });
  
  if (enviosError) {
    console.error("Error fetching pending envios for empresa's clients:", enviosError);
    return [];
  }
  return enviosData as EnvioConCliente[] || [];
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

  const fechaRepartoString = fecha_reparto.toISOString().split('T')[0];

  const repartoToInsert = {
    fecha_reparto: fechaRepartoString,
    repartidor_id,
    tipo_reparto,
    empresa_id: tipo_reparto === 'viaje_empresa' ? empresa_id : null,
    estado: estadoRepartoEnum.Values.asignado, 
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

  const { error: enviosError } = await supabase
    .from("envios")
    .update({ reparto_id: nuevoReparto.id, status: estadoEnvioEnum.Values.asignado_a_reparto })
    .in("id", envio_ids);

  if (enviosError) {
    console.error("Error updating envios for reparto:", enviosError);
    return { success: false, error: `Reparto creado, pero falló la asignación de envíos: ${enviosError.message}. Considere usar una función RPC para atomicidad.` };
  }

  revalidatePath("/repartos");
  revalidatePath("/repartos/nuevo");
  revalidatePath("/envios"); 
  return { success: true, data: nuevoReparto };
}

export async function getRepartosListAction(page = 1, pageSize = 10, searchTerm?: string) {
  const supabase = createSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("repartos")
    .select("*, repartidores (id, nombre), empresas (id, nombre)", { count: "exact" }) // Adjusted alias
    .order("fecha_reparto", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  
  if (searchTerm) {
    query = query.or(`repartidores.nombre.ilike.%${searchTerm}%,empresas.nombre.ilike.%${searchTerm}%,estado.ilike.%${searchTerm}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching repartos list:", error);
    return { data: [], count: 0, error: error.message };
  }
  return { data: data as RepartoConDetalles[] || [], count: count || 0, error: null };
}

export async function getRepartoDetailsAction(repartoId: string): Promise<{ data: RepartoCompleto | null; error: string | null }> {
  const supabase = createSupabaseServerClient();

  const { data: repartoData, error: repartoError } = await supabase
    .from("repartos")
    .select("*, repartidores (id, nombre), empresas (id, nombre)")
    .eq("id", repartoId)
    .single();

  if (repartoError || !repartoData) {
    console.error(`Error fetching reparto details for ID ${repartoId}:`, repartoError);
    return { data: null, error: repartoError?.message || "Reparto no encontrado." };
  }

  const { data: enviosData, error: enviosError } = await supabase
    .from("envios")
    .select("*, clientes (id, nombre, apellido, direccion, email)")
    .eq("reparto_id", repartoId)
    .order("created_at", { ascending: true });

  if (enviosError) {
    console.error(`Error fetching envios for reparto ID ${repartoId}:`, enviosError);
    return { data: null, error: `Error al cargar envíos: ${enviosError.message}` };
  }
  
  const repartoCompleto: RepartoCompleto = {
    ...(repartoData as RepartoConDetalles),
    envios_asignados: enviosData as EnvioConCliente[] || [],
  };

  return { data: repartoCompleto, error: null };
}

export async function updateRepartoEstadoAction(
  repartoId: string, 
  nuevoEstado: EstadoReparto,
  envioIds: string[]
): Promise<{ success: boolean; error?: string | null }> {
  const supabase = createSupabaseServerClient();
  
  const validatedEstado = estadoRepartoEnum.safeParse(nuevoEstado);
  if(!validatedEstado.success){
    return { success: false, error: "Estado de reparto inválido." };
  }

  const { error } = await supabase
    .from("repartos")
    .update({ estado: validatedEstado.data })
    .eq("id", repartoId);

  if (error) {
    console.error("Error updating reparto estado:", error);
    return { success: false, error: error.message };
  }

  if (validatedEstado.data === estadoRepartoEnum.Values.completado && envioIds.length > 0) {
    const { error: enviosError } = await supabase
      .from("envios")
      .update({ status: estadoEnvioEnum.Values.entregado })
      .in("id", envioIds);

    if (enviosError) {
      console.error("Error updating envios status to 'entregado':", enviosError);
      // Reparto status updated, but envios failed. Client should be informed.
      return { success: true, error: `Estado del reparto actualizado, pero falló la actualización de los envíos: ${enviosError.message}` };
    }
  }

  revalidatePath(`/repartos/${repartoId}`);
  revalidatePath("/repartos");
  return { success: true, error: null };
}
