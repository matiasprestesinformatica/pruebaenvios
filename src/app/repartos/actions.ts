
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RepartoCreationFormData, RepartoLoteCreationFormData, EstadoReparto } from "@/lib/schemas";
import { repartoCreationSchema, repartoLoteCreationSchema, estadoRepartoEnum, tipoRepartoEnum, estadoEnvioEnum, tipoParadaEnum as tipoParadaSchemaEnum } from "@/lib/schemas";
import type { Database, Reparto, RepartoConDetalles, Cliente, NuevoEnvio, ParadaConEnvioYCliente, NuevaParadaReparto, ParadaReparto, EnvioConCliente, RepartoCompleto, Empresa, Repartidor as RepartidorType, TipoServicio, EnvioParaDetalleReparto } from "@/types/supabase";
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
      .eq("estado", true)
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
      .select("*, clientes (id, nombre, apellido, direccion, email, latitud, longitud, estado)")
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
      .select("*, clientes (id, nombre, apellido, direccion, email, latitud, longitud, estado)")
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
    tipo_parada: tipoParadaSchemaEnum.Values.entrega_cliente,
    orden: index,
  }));

  if (paradasToInsert.length > 0) {
    const { error: paradasError } = await supabase.from("paradas_reparto").insert(paradasToInsert);
    if (paradasError) {
      const pgParadasError = paradasError as PostgrestError;
      console.error("Error creating paradas_reparto:", JSON.stringify(pgParadasError, null, 2));
      // Even if paradas fail, the reparto and envios linkage was successful, so treat as partial success
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
      if (Object.keys(pgError).length === 0 && typeof pgError === 'object') { // Check for empty error object
        errorMessage = "Error de conexión o configuración con Supabase al obtener detalles del reparto. Verifique RLS para la tabla 'repartos'.";
      }
      return { data: null, error: errorMessage };
    }

    if (!repartoArray || repartoArray.length === 0) {
        return { data: null, error: "Reparto no encontrado." };
    }
    if (repartoArray.length > 1) {
        // This case should ideally not happen if 'id' is a unique primary key
        console.warn(`Multiple repartos found for ID ${repartoId}. Using the first one.`);
    }
    const repartoData = repartoArray[0] as RepartoConDetalles;

    const { data: paradasData, error: paradasError } = await supabase
      .from("paradas_reparto")
      .select("*, envio:envios!left(*, clientes!left(*), tipos_servicio!left(nombre))")
      .eq("reparto_id", repartoId)
      .order("orden", { ascending: true });

    if (paradasError) {
      const pgError = paradasError as PostgrestError;
      console.error(`Error fetching paradas for reparto ID ${repartoId}:`, JSON.stringify(pgError, null, 2));
      let errorMessage = `Error al cargar paradas del reparto: ${pgError.message || "Error desconocido"}`;
       if (Object.keys(pgError).length === 0 && typeof pgError === 'object') { // Check for empty error object
        errorMessage = "Error de conexión o configuración con Supabase al obtener paradas. Verifique RLS para la tabla 'paradas_reparto'.";
      }
      return { data: null, error: errorMessage };
    }

    const paradasConEnvioYCliente: ParadaConEnvioYCliente[] = (paradasData || []).map(p => ({
      ...p,
      envio_id: p.envio_id,
      tipo_parada: p.tipo_parada as Database['public']['Enums']['tipoparadaenum'] | null, // Ensure correct enum type or null
      envio: p.envio ? (p.envio as EnvioParaDetalleReparto) : null
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
    let paradaToSwapWith: Database['public']['Tables']['paradas_reparto']['Row'] | undefined;

    if (direccion === 'up') {
      if (paradaToMove.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa && paradaToMove.orden === 0) {
         return { success: true, error: null }; // Cannot move pickup point up if it's already first
      }
      if (currentIndex === 0) {
        return { success: true, error: null }; // Cannot move first item up
      }
      paradaToSwapWith = paradas[currentIndex - 1];
    } else { // direction 'down'
      if (currentIndex === paradas.length - 1) {
        return { success: true, error: null }; // Cannot move last item down
      }
      paradaToSwapWith = paradas[currentIndex + 1];
    }

    if (!paradaToSwapWith) {
        console.error("Could not find adjacent parada to swap with. Orden values might not be contiguous or at boundary.", { paradas, currentIndex, paradaId, direccion });
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
      // Attempt rollback for the first update
      await supabase
        .from('paradas_reparto')
        .update({ orden: paradaToMove.orden }) // Revert to original orden
        .eq('id', paradaToMove.id);
      return { success: false, error: `Error al actualizar orden (2): ${pgError2.message}` };
    }

    revalidatePath(`/repartos/${repartoId}`);
    revalidatePath("/mapa-envios");
    return { success: true, error: null };

  } catch (e: unknown) {
    const err = e as Error;
    const pgError = err as PostgrestError; // It might not always be a PostgrestError if the catch is for something else
    console.error("Unexpected error in reorderParadasAction:", pgError?.message || err.message);
    return { success: false, error: `Error inesperado en el servidor: ${pgError?.message || err.message}` };
  }
}

export async function getClientesByEmpresaAction(empresaId: string): Promise<Cliente[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, apellido, direccion, email, latitud, longitud, estado")
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

  const { fecha_reparto, repartidor_id, empresa_id, clientes_con_servicio } = validatedFields.data;

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

  const servicioIds = clientes_con_servicio.map(c => c.tipo_servicio_id_lote).filter(Boolean) as string[];
  let preciosServicioMap = new Map<string, number | null>();

  if (servicioIds.length > 0) {
    const { data: tiposServicioDb, error: tiposServicioError } = await supabase
      .from("tipos_servicio")
      .select("id, precio_base")
      .in("id", servicioIds);

    if (tiposServicioError) {
      console.error("Error fetching tipos_servicio for reparto lote:", JSON.stringify(tiposServicioError, null, 2));
      return { success: false, error: "Error al obtener precios de tipos de servicio." };
    }
    preciosServicioMap = new Map(tiposServicioDb?.map(ts => [ts.id, ts.precio_base]));
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

  // Add pickup point from company if it has coordinates
  if (empresaData.latitud != null && empresaData.longitud != null && empresaData.direccion != null) {
    paradasParaInsertar.push({
      reparto_id: nuevoReparto.id,
      envio_id: null, // No envio_id for company pickup
      tipo_parada: tipoParadaSchemaEnum.Values.retiro_empresa,
      orden: currentOrder++,
    });
  } else {
    console.warn(`Empresa ${empresaData.nombre || ''} (ID: ${empresaData.id}) no tiene coordenadas o dirección. No se creará parada de retiro para el reparto ${nuevoReparto.id}.`);
  }

  // Create shipments for selected clients and their stops
  if (clientes_con_servicio && clientes_con_servicio.length > 0) {
    const clienteIdsParaConsulta = clientes_con_servicio.map(c => c.cliente_id);
    const { data: clientesDataDb, error: clientesError } = await supabase
      .from("clientes")
      .select("id, nombre, apellido, direccion, latitud, longitud, estado")
      .in("id", clienteIdsParaConsulta);

    if (clientesError) {
      const pgClientesError = clientesError as PostgrestError;
      console.warn("Error fetching client details for auto-generating shipments (continuing):", JSON.stringify(pgClientesError, null, 2));
    } else if (clientesDataDb) {
        const clientesMap = new Map(clientesDataDb.map(c => [c.id, c]));

        for (const clienteServicio of clientes_con_servicio) {
          const cliente = clientesMap.get(clienteServicio.cliente_id);
          if (!cliente) {
            console.warn(`Cliente con ID ${clienteServicio.cliente_id} no encontrado. No se generará envío.`);
            continue;
          }
          if (!cliente.direccion) {
            console.warn(`Cliente ${cliente.id} (${cliente.nombre || ''} ${cliente.apellido || ''}) no tiene dirección. No se generará envío automático para este cliente en reparto ${nuevoReparto.id}.`);
            continue;
          }

          let precioFinal: number | null = null;
          if (clienteServicio.precio_manual_lote !== null && clienteServicio.precio_manual_lote !== undefined) {
            precioFinal = clienteServicio.precio_manual_lote;
          } else if (clienteServicio.tipo_servicio_id_lote) {
            precioFinal = preciosServicioMap.get(clienteServicio.tipo_servicio_id_lote) ?? null;
          }

          const envioParaInsertar: NuevoEnvio = {
            cliente_id: cliente.id,
            client_location: cliente.direccion,
            latitud: cliente.latitud, // Inherit from client
            longitud: cliente.longitud, // Inherit from client
            package_size: 'medium', // Default
            package_weight: 1,    // Default
            status: estadoEnvioEnum.Values.asignado_a_reparto,
            reparto_id: nuevoReparto.id,
            tipo_servicio_id: clienteServicio.tipo_servicio_id_lote || null,
            precio_servicio_final: precioFinal,
          };

          const { data: nuevoEnvioData, error: envioInsertError } = await supabase
            .from("envios")
            .insert(envioParaInsertar)
            .select("id")
            .single();

          if (envioInsertError || !nuevoEnvioData) {
            const pgEnvioError = envioInsertError as PostgrestError | null;
            console.error(`Error auto-generating shipment for client ${cliente.id} in reparto ${nuevoReparto.id}:`, JSON.stringify(pgEnvioError, null, 2));
            continue; // Skip creating parada for this failed envio
          }

          paradasParaInsertar.push({
            reparto_id: nuevoReparto.id,
            envio_id: nuevoEnvioData.id,
            tipo_parada: tipoParadaSchemaEnum.Values.entrega_cliente,
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
  orderedStopInputIds: string[]
): Promise<{ success: boolean; error?: string | null }> {
  const supabase = createSupabaseServerClient();

  try {
    const { data: repartoData, error: repartoFetchError } = await supabase
      .from('repartos')
      .select('id, empresa_id, tipo_reparto') // Select empresa_id for matching
      .eq('id', repartoId)
      .single();

    if (repartoFetchError || !repartoData) {
      const pgError = repartoFetchError as PostgrestError | null;
      console.error('Error fetching reparto for applying optimized route:', JSON.stringify(pgError, null, 2));
      return { success: false, error: pgError?.message || 'No se pudo encontrar el reparto.' };
    }

    const empresaIdDelReparto = repartoData.empresa_id; // Get the empresa_id of the current reparto

    const updates = orderedStopInputIds.map(async (stopInputId, index) => {
      // Check if the stopInputId is for the company pickup point
      if (stopInputId.startsWith('empresa-') && empresaIdDelReparto && stopInputId === `empresa-${empresaIdDelReparto}`) {
        // This is the company pickup stop
        const { error: updateError } = await supabase
          .from('paradas_reparto')
          .update({ orden: index })
          .eq('reparto_id', repartoId)
          .eq('tipo_parada', tipoParadaSchemaEnum.Values.retiro_empresa)
          .is('envio_id', null); // Ensure we're updating the correct company pickup parada
        if (updateError) throw updateError;
      } else {
        // This is a regular delivery stop (envio_id)
        const { error: updateError } = await supabase
          .from('paradas_reparto')
          .update({ orden: index })
          .eq('reparto_id', repartoId)
          .eq('id', stopInputId); // Match by parada.id, which is the envio_id for delivery stops
        if (updateError) throw updateError;
      }
    });

    await Promise.all(updates);

    revalidatePath(`/repartos/${repartoId}`);
    revalidatePath("/mapa-envios"); // Also revalidate map page as route order changes
    return { success: true, error: null };

  } catch (e: unknown) {
    const err = e as Error;
    const pgError = err as PostgrestError; // It might not always be a PostgrestError
    console.error("Error applying optimized route order:", JSON.stringify(err, null, 2));
    return { success: false, error: pgError?.message || `Error inesperado al aplicar el orden optimizado: ${err.message}` };
  }
}

// The closing triple backticks were removed from here
// ``` removed
