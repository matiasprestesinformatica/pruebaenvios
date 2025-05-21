
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RepartoCreationFormData, RepartoLoteCreationFormData, EstadoReparto } from "@/lib/schemas";
import { repartoCreationSchema, repartoLoteCreationSchema, estadoRepartoEnum, tipoRepartoEnum, estadoEnvioEnum, tipoParadaEnum } from "@/lib/schemas";
import type { Database, Reparto, RepartoConDetalles, Cliente, NuevoEnvio, ParadaConEnvioYCliente, NuevaParadaReparto, ParadaReparto, EnvioConCliente, RepartoCompleto, Empresa, Repartidor as RepartidorType, TipoParadaEnum as TipoParadaEnumTypeFromDB } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { optimizeRoute, type OptimizeRouteInput, type OptimizeRouteOutput } from "@/ai/flows/optimize-route-flow";


export async function getRepartidoresActivosAction(): Promise<Pick<RepartidorType, 'id' | 'nombre'>[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("repartidores")
      .select("id, nombre")
      .eq("estado", true)
      .order("nombre", { ascending: true });

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching active repartidores:", JSON.stringify(pgError, null, 2));
      return [];
    }
    return data || [];
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Critical error in getRepartidoresActivosAction:", err.message);
    return [];
  }
}

export async function getEmpresasForRepartoAction(): Promise<Pick<Empresa, 'id' | 'nombre' | 'direccion' | 'latitud' | 'longitud'>[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("empresas")
      .select("id, nombre, direccion, latitud, longitud")
      .order("nombre", { ascending: true });
    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching empresas for reparto:", JSON.stringify(pgError, null, 2));
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
      .select("*, clientes (id, nombre, apellido, direccion, email, latitud, longitud)")
      .is("reparto_id", null) 
      .eq("status", estadoEnvioEnum.Values.pending); 

    if (searchTerm) {
      query = query.or(`client_location.ilike.%${searchTerm}%,nombre_cliente_temporal.ilike.%${searchTerm}%,clientes.nombre.ilike.%${searchTerm}%,clientes.apellido.ilike.%${searchTerm}%`);
    }
    
    query = query.order("created_at", { ascending: true });

    const { data, error } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching pending envios:", JSON.stringify(pgError, null, 2));
      return [];
    }
    return (data as EnvioConCliente[]) || [];
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
      const pgError = clientesError as PostgrestError;
      console.error("Error fetching clients for empresa:", JSON.stringify(pgError, null, 2));
      return [];
    }
    if (!clientesData || clientesData.length === 0) {
      return []; 
    }
    const clientIds = clientesData.map(c => c.id);

    const { data: enviosData, error: enviosError } = await supabase
      .from("envios")
      .select("*, clientes (id, nombre, apellido, direccion, email, latitud, longitud)")
      .in("cliente_id", clientIds)
      .is("reparto_id", null)
      .eq("status", estadoEnvioEnum.Values.pending)
      .order("created_at", { ascending: true });
    
    if (enviosError) {
      const pgError = enviosError as PostgrestError;
      console.error("Error fetching pending envios for empresa's clients:", JSON.stringify(pgError, null, 2));
      return [];
    }
    return (enviosData as EnvioConCliente[]) || [];
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

  const repartoToInsert: Partial<Reparto> = { 
    fecha_reparto: fechaRepartoString,
    repartidor_id,
    tipo_reparto,
    empresa_id: tipo_reparto === tipoRepartoEnum.Values.viaje_empresa ? empresa_id : null,
    estado: estadoRepartoEnum.Values.asignado, 
  };

  const { data: nuevoReparto, error: repartoError } = await supabase
    .from("repartos")
    .insert(repartoToInsert as Database['public']['Tables']['repartos']['Insert'])
    .select()
    .single();

  if (repartoError || !nuevoReparto) {
    const pgError = repartoError as PostgrestError | null;
    console.error("Error creating reparto:", JSON.stringify(pgError, null, 2));
    return { success: false, error: `No se pudo crear el reparto: ${pgError?.message || 'Error desconocido'}`, data: null };
  }

  const { error: enviosError } = await supabase
    .from("envios")
    .update({ reparto_id: nuevoReparto.id, status: estadoEnvioEnum.Values.asignado_a_reparto })
    .in("id", envio_ids);

  if (enviosError) {
    const pgEnviosError = enviosError as PostgrestError;
    console.warn("Error updating envios for reparto (continuing):", JSON.stringify(pgEnviosError, null, 2));
  }

  const paradasToInsert: NuevaParadaReparto[] = envio_ids.map((envioId, index) => ({
    reparto_id: nuevoReparto.id,
    envio_id: envioId,
    tipo_parada: tipoParadaEnum.Values.entrega_cliente,
    orden: index, 
  }));

  if (paradasToInsert.length > 0) {
    const { error: paradasError } = await supabase.from("paradas_reparto").insert(paradasToInsert);
    if (paradasError) {
      const pgParadasError = paradasError as PostgrestError;
      console.error("Error creating paradas_reparto:", JSON.stringify(pgParadasError, null, 2));
      return { success: true, error: `Reparto y envíos actualizados, pero falló la creación de paradas: ${pgParadasError.message}.`, data: nuevoReparto };
    }
  }

  revalidatePath("/repartos");
  revalidatePath("/repartos/nuevo");
  revalidatePath("/envios"); 
  revalidatePath("/mapa-envios");
  return { success: true, data: nuevoReparto, error: null };
}

export async function getRepartosListAction(page = 1, pageSize = 10, searchTerm?: string): Promise<{data: RepartoConDetalles[], count: number, error: string | null}> {
  try {
    const supabase = createSupabaseServerClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("repartos")
      .select("*, repartidores (id, nombre), empresas (id, nombre, direccion, latitud, longitud)", { count: "exact" }) 
      .order("fecha_reparto", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);
    
    if (searchTerm) {
      query = query.or(`repartidores.nombre.ilike.%${searchTerm}%,empresas.nombre.ilike.%${searchTerm}%,estado.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching repartos list:", JSON.stringify(pgError, null, 2));
      return { data: [], count: 0, error: pgError.message };
    }
    return { data: (data as RepartoConDetalles[]) || [], count: count || 0, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Critical error in getRepartosListAction:", err.message);
    return { data: [], count: 0, error: "Error inesperado en el servidor al obtener lista de repartos." };
  }
}

export async function getRepartoDetailsAction(repartoId: string): Promise<{ data: RepartoCompleto | null; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();

    const { data: repartoArray, error: repartoError } = await supabase
      .from("repartos")
      .select("*, repartidores (id, nombre), empresas (id, nombre, direccion, latitud, longitud)")
      .eq("id", repartoId);
      
    if (repartoError) {
      const pgError = repartoError as PostgrestError;
      console.error(`Error fetching reparto details for ID ${repartoId}:`, JSON.stringify(pgError, null, 2));
      let errorMessage = `Error al cargar detalles del reparto: ${pgError.message || "Error desconocido"}`;
      if (Object.keys(pgError).length === 0 && typeof pgError === 'object') {
        errorMessage = "Error de conexión o configuración con Supabase al obtener detalles del reparto. Verifique RLS para la tabla 'repartos'.";
      }
      return { data: null, error: errorMessage };
    }

    if (!repartoArray || repartoArray.length === 0) {
        return { data: null, error: "Reparto no encontrado." };
    }
    if (repartoArray.length > 1) {
        console.warn(`Multiple repartos found for ID ${repartoId}. Using the first one.`);
    }
    const repartoData = repartoArray[0] as RepartoConDetalles;

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
      envio_id: p.envio_id, 
      tipo_parada: p.tipo_parada as TipoParadaEnumTypeFromDB | null,
      envio: p.envio ? (p.envio as EnvioConCliente) : null
    }));
    
    const repartoCompleto: RepartoCompleto = {
      ...repartoData,
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
    const pgError = repartoUpdateError as PostgrestError;
    console.error("Error updating reparto estado:", JSON.stringify(pgError, null, 2));
    return { success: false, error: pgError.message || "No se pudo actualizar el estado del reparto." };
  }

  if (envioIds && envioIds.length > 0) {
    let nuevoEstadoEnvio: Database['public']['Tables']['envios']['Row']['status'] | null = null;

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
        const pgEnviosError = enviosError as PostgrestError;
        console.warn(`Error updating envios status to '${nuevoEstadoEnvio}' (continuing):`, JSON.stringify(pgEnviosError, null, 2));
        revalidatePath(`/repartos/${repartoId}`);
        revalidatePath("/repartos");
        revalidatePath("/envios");
        revalidatePath("/mapa-envios");
        return { success: true, error: `Estado del reparto actualizado, pero falló la actualización de los envíos: ${pgEnviosError.message}` };
      }
    }
  }

  revalidatePath(`/repartos/${repartoId}`);
  revalidatePath("/repartos");
  revalidatePath("/envios");
  revalidatePath("/mapa-envios");
  return { success: true, error: null };
}

export async function reorderParadasAction(
  repartoId: string,
  paradaId: string,
  direccion: 'up' | 'down'
): Promise<{ success: boolean; error?: string | null }> {
  const supabase = createSupabaseServerClient();

  try {
    const { data: paradas, error: fetchError } = await supabase
      .from('paradas_reparto')
      .select('*')
      .eq('reparto_id', repartoId)
      .order('orden', { ascending: true });

    if (fetchError) {
      const pgFetchError = fetchError as PostgrestError;
      console.error("Error fetching paradas for reorder:", JSON.stringify(pgFetchError, null, 2));
      return { success: false, error: `Error al obtener paradas: ${pgFetchError.message}` };
    }
    if (!paradas || paradas.length === 0) {
      return { success: false, error: "No se encontraron paradas para este reparto." };
    }

    const currentIndex = paradas.findIndex(p => p.id === paradaId);
    if (currentIndex === -1) {
      return { success: false, error: "Parada especificada no encontrada en el reparto." };
    }

    const paradaToMove = paradas[currentIndex];
    let paradaToSwapWith: ParadaReparto | undefined;
    
    if (direccion === 'up') {
      if (currentIndex === 0 || (paradaToMove.tipo_parada === tipoParadaEnum.Values.retiro_empresa && paradaToMove.orden === 0)) { 
        return { success: true, error: null }; 
      }
      paradaToSwapWith = paradas[currentIndex - 1];
    } else { 
      if (currentIndex === paradas.length - 1) {
        return { success: true, error: null }; 
      }
      paradaToSwapWith = paradas[currentIndex + 1];
    }

    if (!paradaToSwapWith) {
        console.error("Could not find adjacent parada to swap with. Orden values might not be contiguous or at boundary.", paradas);
        return { success: false, error: "No se pudo encontrar la parada adyacente para intercambiar el orden."};
    }
    
    const newOrdenForMovedParada = paradaToSwapWith.orden;
    const newOrdenForSwappedParada = paradaToMove.orden;

    const { error: updateError1 } = await supabase
      .from('paradas_reparto')
      .update({ orden: newOrdenForMovedParada })
      .eq('id', paradaToMove.id);

    if (updateError1) {
      const pgError1 = updateError1 as PostgrestError;
      console.error("Error updating orden for moved parada:", JSON.stringify(pgError1, null, 2));
      return { success: false, error: `Error al actualizar orden (1): ${pgError1.message}` };
    }

    const { error: updateError2 } = await supabase
      .from('paradas_reparto')
      .update({ orden: newOrdenForSwappedParada })
      .eq('id', paradaToSwapWith.id);

    if (updateError2) {
      const pgError2 = updateError2 as PostgrestError;
      console.error("Error updating orden for swapped parada, attempting rollback:", JSON.stringify(pgError2, null, 2));
      await supabase
        .from('paradas_reparto')
        .update({ orden: paradaToMove.orden }) 
        .eq('id', paradaToMove.id); 
      return { success: false, error: `Error al actualizar orden (2): ${pgError2.message}` };
    }

    revalidatePath(`/repartos/${repartoId}`);
    revalidatePath("/mapa-envios");
    return { success: true, error: null };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in reorderParadasAction:", err.message);
    return { success: false, error: `Error inesperado en el servidor: ${err.message}` };
  }
}

export async function getClientesByEmpresaAction(empresaId: string): Promise<Cliente[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, apellido, direccion, email, latitud, longitud")
      .eq("empresa_id", empresaId)
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching clientes by empresa:", JSON.stringify(pgError, null, 2));
      return [];
    }
    return (data as Cliente[]) || [];
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Critical error in getClientesByEmpresaAction:", err.message);
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

  const { data: empresaData, error: empresaError } = await supabase
    .from("empresas")
    .select("id, nombre, direccion, latitud, longitud")
    .eq("id", empresa_id)
    .single();

  if (empresaError || !empresaData) {
    const pgEmpresaError = empresaError as PostgrestError | null;
    console.error("Error fetching empresa details for reparto lote:", JSON.stringify(pgEmpresaError, null, 2));
    return { success: false, error: "No se pudieron obtener los detalles de la empresa seleccionada.", data: null };
  }

  const fechaRepartoString = fecha_reparto.toISOString().split('T')[0];
  const repartoToInsert: Partial<Reparto> = {
    fecha_reparto: fechaRepartoString,
    repartidor_id,
    empresa_id,
    tipo_reparto: tipoRepartoEnum.Values.viaje_empresa_lote,
    estado: estadoRepartoEnum.Values.asignado,
  };

  const { data: nuevoReparto, error: repartoError } = await supabase
    .from("repartos")
    .insert(repartoToInsert as Database['public']['Tables']['repartos']['Insert'])
    .select()
    .single();

  if (repartoError || !nuevoReparto) {
    const pgError = repartoError as PostgrestError | null;
    console.error("Error creating reparto lote:", JSON.stringify(pgError, null, 2));
    return { success: false, error: `No se pudo crear el reparto por lote: ${pgError?.message || 'Error desconocido'}`, data: null };
  }

  const paradasParaInsertar: NuevaParadaReparto[] = [];
  let currentOrder = 0;

  if (empresaData.latitud != null && empresaData.longitud != null && empresaData.direccion != null) {
    paradasParaInsertar.push({
      reparto_id: nuevoReparto.id,
      envio_id: null, 
      tipo_parada: tipoParadaEnum.Values.retiro_empresa,
      orden: currentOrder++,
    });
  } else {
    console.warn(`Empresa ${empresaData.nombre} (ID: ${empresaData.id}) no tiene coordenadas o dirección. No se creará parada de retiro para el reparto ${nuevoReparto.id}.`);
  }

  if (cliente_ids && cliente_ids.length > 0) {
    const { data: clientesData, error: clientesError } = await supabase
      .from("clientes")
      .select("id, nombre, apellido, direccion, latitud, longitud") 
      .in("id", cliente_ids);

    if (clientesError) {
      const pgClientesError = clientesError as PostgrestError;
      console.warn("Error fetching client details for auto-generating shipments (continuing):", JSON.stringify(pgClientesError, null, 2));
    } else if (clientesData) {
        for (const cliente of clientesData) {
          if (!cliente.direccion) {
            console.warn(`Cliente ${cliente.id} (${cliente.nombre} ${cliente.apellido}) no tiene dirección. No se generará envío automático para este cliente en reparto ${nuevoReparto.id}.`);
            continue; 
          }
          const envioParaInsertar: NuevoEnvio = {
            cliente_id: cliente.id,
            client_location: cliente.direccion,
            latitud: cliente.latitud,
            longitud: cliente.longitud,
            package_size: 'medium', 
            package_weight: 1,    
            status: estadoEnvioEnum.Values.asignado_a_reparto,
            reparto_id: nuevoReparto.id, 
          };
          
          const { data: nuevoEnvioData, error: envioInsertError } = await supabase
            .from("envios")
            .insert(envioParaInsertar)
            .select("id")
            .single();

          if (envioInsertError || !nuevoEnvioData) {
            const pgEnvioError = envioInsertError as PostgrestError | null;
            console.error(`Error auto-generating shipment for client ${cliente.id} in reparto ${nuevoReparto.id}:`, JSON.stringify(pgEnvioError, null, 2));
            continue;
          }
          
          paradasParaInsertar.push({
            reparto_id: nuevoReparto.id,
            envio_id: nuevoEnvioData.id,
            tipo_parada: tipoParadaEnum.Values.entrega_cliente,
            orden: currentOrder++,
          });
        }
    }
  }
  
  if (paradasParaInsertar.length > 0) {
    const { error: paradasError } = await supabase.from("paradas_reparto").insert(paradasParaInsertar);
    if (paradasError) {
      const pgParadasError = paradasError as PostgrestError;
      console.error("Error creating paradas_reparto for reparto lote:", JSON.stringify(pgParadasError, null, 2));
      revalidatePath("/repartos");
      revalidatePath("/repartos/lote/nuevo");
      revalidatePath("/envios"); 
      revalidatePath("/mapa-envios");
      return { success: true, data: nuevoReparto, error: `Reparto y envíos creados (si aplica), pero falló la creación de algunas paradas: ${pgParadasError.message}.` };
    }
  }

  revalidatePath("/repartos");
  revalidatePath("/repartos/lote/nuevo");
  revalidatePath("/envios"); 
  revalidatePath("/mapa-envios");
  return { success: true, data: nuevoReparto, error: null };
}

export async function optimizeRouteAction(
  paradasInput: OptimizeRouteInput
): Promise<{ success: boolean; data?: OptimizeRouteOutput | null; error?: string | null }> {
  if (!paradasInput || !paradasInput.stops || paradasInput.stops.length < 2) {
    return { success: false, error: "Se requieren al menos dos paradas para optimizar la ruta.", data: null };
  }
  try {
    const result = await optimizeRoute(paradasInput);
    if (!result) {
      return { success: false, error: "La IA no devolvió un resultado para la optimización.", data: null };
    }
    return { success: true, data: result, error: null };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error calling optimizeRoute AI flow in action:", err);
    return { success: false, error: err.message || "Error inesperado durante la optimización de ruta.", data: null };
  }
}


export async function applyOptimizedRouteOrderAction(
  repartoId: string,
  orderedStopInputIds: string[] // Contiene parada.id para envíos y 'empresa-XYZ' para retiro
): Promise<{ success: boolean; error?: string | null }> {
  const supabase = createSupabaseServerClient();

  try {
    // Obtener el reparto para saber el empresa_id si es necesario
    const { data: repartoData, error: repartoFetchError } = await supabase
      .from('repartos')
      .select('id, empresa_id, tipo_reparto')
      .eq('id', repartoId)
      .single();

    if (repartoFetchError || !repartoData) {
      const pgError = repartoFetchError as PostgrestError | null;
      console.error('Error fetching reparto for applying optimized route:', JSON.stringify(pgError, null, 2));
      return { success: false, error: pgError?.message || 'No se pudo encontrar el reparto.' };
    }

    const empresaIdDelReparto = repartoData.empresa_id;
    const idParadaRetiroEmpresa = empresaIdDelReparto ? `empresa-${empresaIdDelReparto}` : null;

    const updates = orderedStopInputIds.map(async (stopInputId, index) => {
      if (idParadaRetiroEmpresa && stopInputId === idParadaRetiroEmpresa) {
        // Es la parada de retiro de la empresa
        const { error: updateError } = await supabase
          .from('paradas_reparto')
          .update({ orden: index })
          .eq('reparto_id', repartoId)
          .eq('tipo_parada', tipoParadaEnum.Values.retiro_empresa);
        if (updateError) throw updateError;
      } else {
        // Es una parada de entrega (envio_id)
        const { error: updateError } = await supabase
          .from('paradas_reparto')
          .update({ orden: index })
          .eq('reparto_id', repartoId)
          .eq('id', stopInputId); // Asumimos que stopInputId es el parada.id para envíos
        if (updateError) throw updateError;
      }
    });

    await Promise.all(updates);

    revalidatePath(`/repartos/${repartoId}`);
    revalidatePath("/mapa-envios"); 
    return { success: true, error: null };

  } catch (e: unknown) {
    const err = e as Error;
    const pgError = err as PostgrestError;
    console.error("Error applying optimized route order:", JSON.stringify(err, null, 2));
    return { success: false, error: pgError?.message || `Error inesperado al aplicar el orden optimizado: ${err.message}` };
  }
}

    