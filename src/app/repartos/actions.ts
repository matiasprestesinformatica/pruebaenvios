
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RepartoCreationFormData, RepartoLoteCreationFormData, EstadoReparto } from "@/lib/schemas";
import { repartoCreationSchema, repartoLoteCreationSchema, estadoRepartoEnum, tipoRepartoEnum, estadoEnvioEnum } from "@/lib/schemas";
import type { Database, Reparto, RepartoConDetalles, EnvioConCliente, RepartoCompleto, Cliente, NuevoEnvio, ParadaConEnvioYCliente, NuevaParadaReparto, ParadaReparto } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

type Repartidores = Database['public']['Tables']['repartidores']['Row'];
type Empresas = Database['public']['Tables']['empresas']['Row'];


export async function getRepartidoresActivosAction(): Promise<Pick<Repartidores, 'id' | 'nombre'>[]> {
  try {
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
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Critical error in getRepartidoresActivosAction:", err.message);
    return [];
  }
}

export async function getEmpresasForRepartoAction(): Promise<Pick<Empresas, 'id' | 'nombre'>[]> {
  try {
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
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Critical error in getEmpresasForRepartoAction:", err.message);
    return [];
  }
}

export async function getEnviosPendientesAction(searchTerm?: string): Promise<EnvioConCliente[]> {
  try {
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
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Critical error in getEnviosPendientesAction:", err.message);
    return [];
  }
}

export async function getEnviosPendientesPorEmpresaAction(empresaId: string): Promise<EnvioConCliente[]> {
  try {
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
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Critical error in getEnviosPendientesPorEmpresaAction:", err.message);
    return [];
  }
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
      data: null,
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
    return { success: false, error: `No se pudo crear el reparto: ${repartoError.message}`, data: null };
  }

  if (!nuevoReparto) {
    return { success: false, error: "No se pudo crear el reparto, no se obtuvo respuesta.", data: null };
  }

  const { error: enviosError } = await supabase
    .from("envios")
    .update({ reparto_id: nuevoReparto.id, status: estadoEnvioEnum.Values.asignado_a_reparto })
    .in("id", envio_ids);

  if (enviosError) {
    console.error("Error updating envios for reparto:", enviosError);
    return { success: true, error: `Reparto creado, pero falló la asignación de envíos: ${enviosError.message}.`, data: nuevoReparto };
  }

  const paradasToInsert: NuevaParadaReparto[] = envio_ids.map((envioId, index) => ({
    reparto_id: nuevoReparto.id,
    envio_id: envioId,
    orden: index, 
  }));

  if (paradasToInsert.length > 0) {
    const { error: paradasError } = await supabase.from("paradas_reparto").insert(paradasToInsert);
    if (paradasError) {
      console.error("Error creating paradas_reparto:", paradasError);
      return { success: true, error: `Reparto y envíos actualizados, pero falló la creación de paradas: ${paradasError.message}.`, data: nuevoReparto };
    }
  }

  revalidatePath("/repartos");
  revalidatePath("/repartos/nuevo");
  revalidatePath("/envios"); 
  return { success: true, data: nuevoReparto, error: null };
}

export async function getRepartosListAction(page = 1, pageSize = 10, searchTerm?: string): Promise<{data: RepartoConDetalles[], count: number, error: string | null}> {
  try {
    const supabase = createSupabaseServerClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("repartos")
      .select("*, repartidores (id, nombre), empresas (id, nombre, direccion)", { count: "exact" }) 
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
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Critical error in getRepartosListAction:", err.message);
    return { data: [], count: 0, error: "Error inesperado en el servidor al obtener lista de repartos." };
  }
}

export async function getRepartoDetailsAction(repartoId: string): Promise<{ data: RepartoCompleto | null; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();

    const { data: repartoData, error: repartoError } = await supabase
      .from("repartos")
      .select("*, repartidores (id, nombre), empresas (id, nombre, direccion)")
      .eq("id", repartoId)
      .single();

    if (repartoError) {
      const pgError = repartoError as PostgrestError;
      console.error(`Error fetching reparto details for ID ${repartoId}:`, JSON.stringify(pgError, null, 2));
      let errorMessage = `Error al cargar detalles del reparto: ${pgError.message || "Error desconocido"}`;
      if (Object.keys(pgError).length === 0 && typeof pgError === 'object') {
        errorMessage = "Error de conexión o configuración con Supabase al obtener detalles del reparto. Verifique RLS para la tabla 'repartos'.";
      }
      return { data: null, error: errorMessage };
    }
    if (!repartoData) {
        return { data: null, error: "Reparto no encontrado." };
    }

    const { data: paradasData, error: paradasError } = await supabase
      .from("paradas_reparto")
      .select("*, envio:envios (*, clientes (*))") 
      .eq("reparto_id", repartoId)
      .order("orden", { ascending: true });

    if (paradasError) {
      const pgError = paradasError as PostgrestError;
      console.error(`Error fetching paradas for reparto ID ${repartoId}:`, JSON.stringify(pgError, null, 2));
      let errorMessage = `Error al cargar paradas del reparto: ${pgError.message || "Error desconocido"}`;
       if (Object.keys(pgError).length === 0 && typeof pgError === 'object') { 
        errorMessage = "Error de conexión o configuración con Supabase al obtener paradas. Verifique RLS para la tabla 'paradas_reparto'.";
      }
      return { data: null, error: errorMessage };
    }
    
    const paradasConEnvioYCliente: ParadaConEnvioYCliente[] = (paradasData || []).map(p => ({
      ...p,
      envio: p.envio as EnvioConCliente 
    }));
    
    const repartoCompleto: RepartoCompleto = {
      ...(repartoData as RepartoConDetalles),
      paradas: paradasConEnvioYCliente,
    };

    return { data: repartoCompleto, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getRepartoDetailsAction:", err.message);
    return { data: null, error: `Error inesperado en el servidor al obtener detalles del reparto: ${err.message}` };
  }
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

  const { error: repartoUpdateError } = await supabase
    .from("repartos")
    .update({ estado: validatedEstado.data })
    .eq("id", repartoId);

  if (repartoUpdateError) {
    console.error("Error updating reparto estado:", repartoUpdateError);
    return { success: false, error: repartoUpdateError.message };
  }

  if (envioIds && envioIds.length > 0) {
    let nuevoEstadoEnvio: typeof estadoEnvioEnum.Values.asignado_a_reparto | typeof estadoEnvioEnum.Values.en_transito | typeof estadoEnvioEnum.Values.entregado | null = null;

    if (validatedEstado.data === estadoRepartoEnum.Values.completado) {
      nuevoEstadoEnvio = estadoEnvioEnum.Values.entregado;
    } else if (validatedEstado.data === estadoRepartoEnum.Values.en_curso) {
      nuevoEstadoEnvio = estadoEnvioEnum.Values.en_transito;
    } else if (validatedEstado.data === estadoRepartoEnum.Values.asignado) {
      nuevoEstadoEnvio = estadoEnvioEnum.Values.asignado_a_reparto;
    }

    if (nuevoEstadoEnvio) {
      const { error: enviosError } = await supabase
        .from("envios")
        .update({ status: nuevoEstadoEnvio })
        .in("id", envioIds);

      if (enviosError) {
        console.error(`Error updating envios status to '${nuevoEstadoEnvio}':`, enviosError);
        return { success: true, error: `Estado del reparto actualizado, pero falló la actualización de los envíos: ${enviosError.message}` };
      }
    }
  }

  revalidatePath(`/repartos/${repartoId}`);
  revalidatePath("/repartos");
  revalidatePath("/envios");
  return { success: true, error: null };
}

export async function reorderParadasAction(
  repartoId: string,
  paradaId: string,
  direccion: 'up' | 'down'
): Promise<{ success: boolean; error?: string | null }> {
  const supabase = createSupabaseServerClient();

  try {
    // 1. Fetch all current stops for the reparto, ordered by 'orden'
    const { data: paradas, error: fetchError } = await supabase
      .from('paradas_reparto')
      .select('*')
      .eq('reparto_id', repartoId)
      .order('orden', { ascending: true });

    if (fetchError) {
      console.error("Error fetching paradas for reorder:", fetchError);
      return { success: false, error: `Error al obtener paradas: ${fetchError.message}` };
    }
    if (!paradas || paradas.length === 0) {
      return { success: false, error: "No se encontraron paradas para este reparto." };
    }

    // 2. Find the index of the stop to move
    const currentIndex = paradas.findIndex(p => p.id === paradaId);
    if (currentIndex === -1) {
      return { success: false, error: "Parada especificada no encontrada en el reparto." };
    }

    const paradaToMove = paradas[currentIndex];
    let paradaToSwapWith: ParadaReparto | undefined;
    let newOrdenForMovedParada: number;
    let newOrdenForSwappedParada: number;

    // 3. Determine target index and validate move
    if (direccion === 'up') {
      if (currentIndex === 0) {
        return { success: true, error: null }; // Already at the top
      }
      paradaToSwapWith = paradas[currentIndex - 1];
      newOrdenForMovedParada = paradaToSwapWith.orden;
      newOrdenForSwappedParada = paradaToMove.orden;
    } else { // 'down'
      if (currentIndex === paradas.length - 1) {
        return { success: true, error: null }; // Already at the bottom
      }
      paradaToSwapWith = paradas[currentIndex + 1];
      newOrdenForMovedParada = paradaToSwapWith.orden;
      newOrdenForSwappedParada = paradaToMove.orden;
    }

    if (!paradaToSwapWith) {
        return { success: false, error: "No se pudo encontrar la parada con la que intercambiar."}
    }

    // 4. Update the 'orden' for the two affected records
    // Ideally, this would be a transaction. For now, two separate updates.
    const { error: updateError1 } = await supabase
      .from('paradas_reparto')
      .update({ orden: newOrdenForMovedParada })
      .eq('id', paradaToMove.id);

    if (updateError1) {
      console.error("Error updating orden for moved parada:", updateError1);
      return { success: false, error: `Error al actualizar orden (1): ${updateError1.message}` };
    }

    const { error: updateError2 } = await supabase
      .from('paradas_reparto')
      .update({ orden: newOrdenForSwappedParada })
      .eq('id', paradaToSwapWith.id);

    if (updateError2) {
      // Attempt to revert the first update if the second one fails (rudimentary rollback)
      await supabase
        .from('paradas_reparto')
        .update({ orden: paradaToMove.orden }) // original orden
        .eq('id', paradaToMove.id);
      console.error("Error updating orden for swapped parada:", updateError2);
      return { success: false, error: `Error al actualizar orden (2): ${updateError2.message}` };
    }

    // 5. Revalidate
    revalidatePath(`/repartos/${repartoId}`);
    return { success: true, error: null };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in reorderParadasAction:", err.message);
    return { success: false, error: `Error inesperado en el servidor: ${err.message}` };
  }
}


// --- Acciones para Repartos por Lote ---

export async function getClientesByEmpresaAction(empresaId: string): Promise<Cliente[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("*") 
      .eq("empresa_id", empresaId)
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true });
  
    if (error) {
      console.error("Error fetching clientes by empresa:", error);
      return [];
    }
    return data || [];
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Critical error in getClientesByEmpresaAction:", err.message);
    return [];
  }
}

export async function getEnviosByClientesAction(clienteIds: string[]): Promise<EnvioConCliente[]> {
  try {
    if (!clienteIds || clienteIds.length === 0) {
        return [];
    }
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("envios")
      .select("*, clientes (id, nombre, apellido, direccion, email)")
      .in("cliente_id", clienteIds)
      .order("created_at", { ascending: true });
  
    if (error) {
      console.error("Error fetching envios by clientes:", error);
      return [];
    }
    return data as EnvioConCliente[] || [];
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Critical error in getEnviosByClientesAction:", err.message);
    return [];
  }
}

export async function createRepartoLoteAction(
  formData: RepartoLoteCreationFormData
): Promise<{ success: boolean; error?: string | null; data?: Reparto | null }> {
  const supabase = createSupabaseServerClient();

  const validatedFields = repartoLoteCreationSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación (Lote): " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
      data: null,
    };
  }
  
  const { fecha_reparto, repartidor_id, empresa_id, cliente_ids } = validatedFields.data;

  const fechaRepartoString = fecha_reparto.toISOString().split('T')[0];

  const repartoToInsert = {
    fecha_reparto: fechaRepartoString,
    repartidor_id,
    empresa_id,
    tipo_reparto: tipoRepartoEnum.Values.viaje_empresa_lote,
    estado: estadoRepartoEnum.Values.asignado,
  };

  const { data: nuevoReparto, error: repartoError } = await supabase
    .from("repartos")
    .insert(repartoToInsert)
    .select()
    .single();

  if (repartoError) {
    console.error("Error creating reparto lote:", repartoError);
    return { success: false, error: `No se pudo crear el reparto por lote: ${repartoError.message}`, data: null };
  }

  if (!nuevoReparto) {
    return { success: false, error: "No se pudo crear el reparto por lote, no se obtuvo respuesta.", data: null };
  }

  if (cliente_ids && cliente_ids.length > 0) {
    const { data: clientesData, error: clientesError } = await supabase
      .from("clientes")
      .select("id, direccion") 
      .in("id", cliente_ids);

    if (clientesError) {
      console.error("Error fetching client details for auto-generating shipments:", clientesError);
      return { success: true, error: `Reparto por lote creado, pero falló la obtención de detalles de clientes: ${clientesError.message}.`, data: nuevoReparto };
    }

    const nuevosEnviosParaInsertar: NuevoEnvio[] = [];
    for (const cliente of clientesData || []) {
      if (!cliente.direccion) {
        console.warn(`Cliente ${cliente.id} no tiene dirección. No se generará envío automático para este cliente.`);
        continue; 
      }
      nuevosEnviosParaInsertar.push({
        cliente_id: cliente.id,
        client_location: cliente.direccion,
        package_size: 'medium', 
        package_weight: 1, 
        status: estadoEnvioEnum.Values.asignado_a_reparto,
        reparto_id: nuevoReparto.id, 
      });
    }

    if (nuevosEnviosParaInsertar.length > 0) {
      const { data: insertedEnvios, error: enviosInsertError } = await supabase
        .from("envios")
        .insert(nuevosEnviosParaInsertar)
        .select("id"); 

      if (enviosInsertError) {
        console.error("Error auto-generating shipments for reparto lote:", enviosInsertError);
        return { success: true, error: `Reparto por lote creado, pero falló la generación automática de envíos: ${enviosInsertError.message}.`, data: nuevoReparto };
      }
      
      if (insertedEnvios && insertedEnvios.length > 0) {
        const paradasToInsertLote: NuevaParadaReparto[] = insertedEnvios.map((envio, index) => ({
          reparto_id: nuevoReparto.id,
          envio_id: envio.id,
          orden: index,
        }));

        const { error: paradasError } = await supabase.from("paradas_reparto").insert(paradasToInsertLote);
        if (paradasError) {
          console.error("Error creating paradas_reparto for auto-generated shipments:", paradasError);
        }
      }
    }
  }

  revalidatePath("/repartos");
  revalidatePath("/repartos/lote/nuevo");
  revalidatePath("/envios"); 
  return { success: true, data: nuevoReparto, error: null };
}
