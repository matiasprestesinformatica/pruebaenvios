
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RepartoCreationFormData, RepartoLoteCreationFormData, EstadoReparto } from "@/lib/schemas";
import { repartoCreationSchema, repartoLoteCreationSchema, estadoRepartoEnum, tipoRepartoEnum, estadoEnvioEnum, tipoParadaEnum } from "@/lib/schemas";
import type { Database, Reparto, RepartoConDetalles, Cliente, NuevoEnvio, ParadaConEnvioYCliente, NuevaParadaReparto, ParadaReparto, EnvioConCliente, RepartoCompleto, Empresa, Repartidor as RepartidorType } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";


export async function getRepartidoresActivosAction(): Promise<Pick<RepartidorType, 'id' | 'nombre'>[]> {
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

export async function getEmpresasForRepartoAction(): Promise<Pick<Empresa, 'id' | 'nombre' | 'direccion' | 'latitud' | 'longitud'>[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("empresas")
      .select("id, nombre, direccion, latitud, longitud") // Added direccion, latitud, longitud
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
      .select("*, clientes (id, nombre, apellido, direccion, email, latitud, longitud)")
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
      .select("*, clientes (id, nombre, apellido, direccion, email, latitud, longitud)")
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
    // Consider rolling back reparto creation or logging this more severely
    return { success: true, error: `Reparto creado, pero falló la asignación de envíos: ${enviosError.message}.`, data: nuevoReparto };
  }

  const paradasToInsert: NuevaParadaReparto[] = envio_ids.map((envioId, index) => ({
    reparto_id: nuevoReparto.id,
    envio_id: envioId,
    tipo_parada: tipoParadaEnum.Values.entrega_cliente,
    orden: index, // For individual or simple viaje_empresa, order might be less critical initially
  }));

  if (paradasToInsert.length > 0) {
    const { error: paradasError } = await supabase.from("paradas_reparto").insert(paradasToInsert);
    if (paradasError) {
      console.error("Error creating paradas_reparto:", paradasError);
      // Consider further error handling or logging
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
      .select("*, repartidores (id, nombre), empresas (id, nombre, direccion, latitud, longitud)", { count: "exact" }) 
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
      envio_id: p.envio_id, // Ensure envio_id is passed even if null
      tipo_parada: p.tipo_parada, // Pass tipo_parada
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
      if (paradaToMove.orden === 0) { // Cannot move up if it's already the first (pickup or first delivery)
        return { success: true, error: null }; 
      }
      // Find the parada with orden = paradaToMove.orden - 1
      paradaToSwapWith = paradas.find(p => p.orden === paradaToMove.orden - 1);
    } else { // 'down'
      // Cannot move down if it's the last
      if (currentIndex === paradas.length - 1) {
        return { success: true, error: null }; 
      }
      // Find the parada with orden = paradaToMove.orden + 1
      paradaToSwapWith = paradas.find(p => p.orden === paradaToMove.orden + 1);
    }

    if (!paradaToSwapWith) {
        // This might happen if 'orden' values are not contiguous, which shouldn't be the case
        // after creation but could occur due to other manual DB operations.
        console.error("Could not find adjacent parada to swap with. Orden values might not be contiguous.", paradas);
        return { success: false, error: "No se pudo encontrar la parada adyacente para intercambiar el orden."};
    }
    
    // Swap 'orden' values
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
    return { success: true, error: null };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in reorderParadasAction:", err.message);
    return { success: false, error: `Error inesperado en el servidor: ${err.message}` };
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

  // 1. Fetch Empresa details for pickup point
  const { data: empresaData, error: empresaError } = await supabase
    .from("empresas")
    .select("id, nombre, direccion, latitud, longitud")
    .eq("id", empresa_id)
    .single();

  if (empresaError || !empresaData) {
    console.error("Error fetching empresa details for reparto lote:", empresaError);
    return { success: false, error: "No se pudieron obtener los detalles de la empresa seleccionada.", data: null };
  }
  if (!empresaData.latitud || !empresaData.longitud) {
      console.warn(`Empresa ${empresaData.nombre} no tiene coordenadas. No se podrá crear parada de retiro geolocalizada.`);
      // Decide if you want to proceed without pickup or return error
      // For now, proceed but pickup won't be on map
  }


  // 2. Create the Reparto
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

  // 3. Create Paradas
  const paradasParaInsertar: NuevaParadaReparto[] = [];

  // 3a. Create Pickup Stop (Parada 0)
  paradasParaInsertar.push({
    reparto_id: nuevoReparto.id,
    envio_id: null, // No envio_id for pickup
    tipo_parada: tipoParadaEnum.Values.retiro_empresa,
    orden: 0,
  });

  // 3b. Create Delivery Stops for selected clients
  if (cliente_ids && cliente_ids.length > 0) {
    const { data: clientesData, error: clientesError } = await supabase
      .from("clientes")
      .select("id, direccion, latitud, longitud") 
      .in("id", cliente_ids);

    if (clientesError) {
      console.error("Error fetching client details for auto-generating shipments:", clientesError);
      return { success: true, error: `Reparto por lote creado, pero falló la obtención de detalles de clientes: ${clientesError.message}.`, data: nuevoReparto };
    }

    let currentOrder = 1; // Start delivery stops from orden 1
    for (const cliente of clientesData || []) {
      if (!cliente.direccion) {
        console.warn(`Cliente ${cliente.id} no tiene dirección. No se generará envío automático para este cliente.`);
        continue; 
      }
      const envioParaInsertar: NuevoEnvio = {
        cliente_id: cliente.id,
        client_location: cliente.direccion,
        latitud: cliente.latitud, 
        longitud: cliente.longitud, 
        package_size: 'medium', // Default, can be configurable
        package_weight: 1,    // Default, can be configurable
        status: estadoEnvioEnum.Values.asignado_a_reparto,
        reparto_id: nuevoReparto.id, 
      };
      
      const { data: nuevoEnvioData, error: envioInsertError } = await supabase
        .from("envios")
        .insert(envioParaInsertar)
        .select("id")
        .single();

      if (envioInsertError || !nuevoEnvioData) {
        console.error(`Error auto-generating shipment for client ${cliente.id}:`, envioInsertError);
        // Decide how to handle: skip this client, or fail the whole batch?
        // For now, skip and continue
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
  
  // 4. Insert all paradas
  if (paradasParaInsertar.length > 0) {
    const { error: paradasError } = await supabase.from("paradas_reparto").insert(paradasParaInsertar);
    if (paradasError) {
      console.error("Error creating paradas_reparto for reparto lote:", paradasError);
      // Consider cleanup or more robust error handling
      return { success: true, error: `Reparto y envíos creados, pero falló la creación de paradas: ${paradasError.message}.`, data: nuevoReparto };
    }
  }

  revalidatePath("/repartos");
  revalidatePath("/repartos/lote/nuevo");
  revalidatePath("/envios"); 
  return { success: true, data: nuevoReparto, error: null };
}
    
