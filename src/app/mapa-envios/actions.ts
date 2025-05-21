
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EnvioMapa, Reparto, Repartidor, RepartoParaFiltro, Envio, Cliente, ParadaReparto, Database, TipoParadaEnum as TipoParadaEnumTypeFromDB, Empresa } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { tipoParadaEnum } from "@/lib/schemas";


const MDP_BOUNDS = {
  minLat: -38.15, 
  maxLat: -37.90, 
  minLng: -57.70, 
  maxLng: -57.45, 
};

type EnvioConClienteParaMapa = Envio & { clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido'> | null };

type ParadaConDetalles = ParadaReparto & {
  envio: (Envio & { clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido'> | null }) | null;
  repartos: (Reparto & { empresas: Pick<Empresa, 'id' | 'nombre' | 'direccion' | 'latitud' | 'longitud'> | null }) | null;
};

export async function getEnviosGeolocalizadosAction(
  repartoId?: string | null
): Promise<{ data: EnvioMapa[]; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    let enviosMapa: EnvioMapa[] = [];

    if (repartoId && repartoId !== "all" && repartoId !== "unassigned") {
      const { data: paradasData, error: paradasError } = await supabase
        .from("paradas_reparto")
        .select(`
          id,
          orden,
          tipo_parada,
          envio:envios!left(
            id,
            created_at,
            cliente_id,
            nombre_cliente_temporal,
            client_location,
            latitud,
            longitud,
            package_size,
            package_weight,
            status,
            reparto_id,
            clientes (id, nombre, apellido)
          ),
          repartos (
            id,
            empresa_id,
            empresas (id, nombre, direccion, latitud, longitud)
          )
        `)
        .eq("reparto_id", repartoId)
        .order("orden", { ascending: true });

      if (paradasError) {
        const pgError = paradasError as PostgrestError;
        console.error("Error fetching paradas_reparto for map:", JSON.stringify(pgError, null, 2));
        return { data: [], error: `Error al cargar paradas del reparto: ${pgError.message}` };
      }
      
      enviosMapa = (paradasData as ParadaConDetalles[] || []).map(parada => {
        if (parada.tipo_parada === tipoParadaEnum.Values.retiro_empresa) {
          const empresa = parada.repartos?.empresas;
          if (empresa?.latitud != null && empresa?.longitud != null) {
            return {
              id: `pickup-${empresa.id}-${parada.id}`,
              latitud: empresa.latitud,
              longitud: empresa.longitud,
              status: 'pickup',
              nombre_cliente: empresa.nombre || 'Punto de Retiro',
              client_location: empresa.direccion || 'Dirección de empresa no disponible',
              package_size: null,
              package_weight: null,
              orden: parada.orden,
              tipo_parada: tipoParadaEnum.Values.retiro_empresa,
            };
          }
        } else if (parada.envio?.latitud != null && parada.envio?.longitud != null &&
                   parada.envio.latitud >= MDP_BOUNDS.minLat && parada.envio.latitud <= MDP_BOUNDS.maxLat &&
                   parada.envio.longitud >= MDP_BOUNDS.minLng && parada.envio.longitud <= MDP_BOUNDS.maxLng) {
          const envioData = parada.envio as EnvioConClienteParaMapa;
          return {
              id: envioData.id,
              latitud: envioData.latitud as number,
              longitud: envioData.longitud as number,
              status: envioData.status,
              nombre_cliente: envioData.clientes ? `${envioData.clientes.nombre} ${envioData.clientes.apellido}` : envioData.nombre_cliente_temporal,
              client_location: envioData.client_location,
              package_size: envioData.package_size,
              package_weight: envioData.package_weight,
              orden: parada.orden,
              tipo_parada: tipoParadaEnum.Values.entrega_cliente,
          };
        }
        return null;
      }).filter(Boolean) as EnvioMapa[];

    } else { 
      let query = supabase
        .from("envios")
        .select("*, clientes (id, nombre, apellido)") 
        .not("latitud", "is", null)
        .not("longitud", "is", null)
        .gte("latitud", MDP_BOUNDS.minLat)
        .lte("latitud", MDP_BOUNDS.maxLat)
        .gte("longitud", MDP_BOUNDS.minLng)
        .lte("longitud", MDP_BOUNDS.maxLng)
        .order("created_at", { ascending: false });

      if (repartoId === "unassigned") {
        query = query.is("reparto_id", null);
      }

      const { data: enviosData, error: enviosError } = await query;

      if (enviosError) {
        const pgError = enviosError as PostgrestError;
        console.error("Error fetching envios for map:", JSON.stringify(pgError, null, 2));
        let errorMessage = "Ocurrió un error al cargar los envíos para el mapa.";
        if (Object.keys(pgError).length === 0 && typeof pgError === 'object') {
          errorMessage = "Error de conexión o configuración con Supabase. Verifique RLS.";
        } else if (pgError.message) {
          errorMessage = pgError.message;
        }
        return { data: [], error: errorMessage };
      }

      enviosMapa = (enviosData as EnvioConClienteParaMapa[] || []).map(envio => ({
        id: envio.id,
        latitud: envio.latitud as number, 
        longitud: envio.longitud as number, 
        status: envio.status,
        nombre_cliente: envio.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}` : envio.nombre_cliente_temporal,
        client_location: envio.client_location,
        package_size: envio.package_size,
        package_weight: envio.package_weight,
        orden: null, 
        tipo_parada: tipoParadaEnum.Values.entrega_cliente,
      }));
    }
    return { data: enviosMapa, error: null };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEnviosGeolocalizadosAction:", err.message);
    return { data: [], error: "Error inesperado en el servidor al obtener envíos para el mapa." };
  }
}


export async function getEnviosNoAsignadosGeolocalizadosAction(): Promise<{ data: EnvioMapa[]; count: number; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    let query = supabase
      .from("envios")
      .select("*, clientes (id, nombre, apellido)", { count: "exact" })
      .is("reparto_id", null)
      .not("latitud", "is", null)
      .not("longitud", "is", null)
      .gte("latitud", MDP_BOUNDS.minLat)
      .lte("latitud", MDP_BOUNDS.maxLat)
      .gte("longitud", MDP_BOUNDS.minLng)
      .lte("longitud", MDP_BOUNDS.maxLng)
      .order("created_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching unassigned geolocated envios:", JSON.stringify(pgError, null, 2));
      return { data: [], count: 0, error: `Error al cargar envíos no asignados: ${pgError.message}` };
    }

    const enviosMapa: EnvioMapa[] = (data as EnvioConClienteParaMapa[] || []).map(envio => ({
      id: envio.id,
      latitud: envio.latitud as number,
      longitud: envio.longitud as number,
      status: envio.status,
      nombre_cliente: envio.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}` : envio.nombre_cliente_temporal,
      client_location: envio.client_location,
      package_size: envio.package_size,
      package_weight: envio.package_weight,
      orden: null, 
      tipo_parada: tipoParadaEnum.Values.entrega_cliente, 
    }));

    return { data: enviosMapa, count: count || 0, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEnviosNoAsignadosGeolocalizadosAction:", err.message);
    return { data: [], count: 0, error: "Error inesperado al obtener envíos no asignados." };
  }
}

type RepartoDataForFilter = Pick<Reparto, 'id' | 'fecha_reparto' | 'tipo_reparto'> & {
  repartidores: Pick<Repartidor, 'nombre'> | null;
  empresas: Pick<Empresa, 'id' | 'nombre'> | null; // Added empresa
};

export async function getRepartosForMapFilterAction(): Promise<{ data: RepartoParaFiltro[]; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("repartos")
      .select("id, fecha_reparto, tipo_reparto, repartidores (nombre), empresas (id, nombre)") // Added empresas(id, nombre)
      .order("fecha_reparto", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20); 

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching repartos for map filter:", JSON.stringify(pgError, null, 2));
      return { data: [], error: "No se pudieron cargar los repartos para el filtro." };
    }
    
    const repartosFetched = (data as RepartoDataForFilter[]) || [];

    const repartosParaFiltro: RepartoParaFiltro[] = repartosFetched.map(r => {
      let label = `Reparto del ${r.fecha_reparto ? format(parseISO(r.fecha_reparto), "dd MMM yy", { locale: es }) : 'N/A'}`;
      if (r.repartidores?.nombre) {
        label += ` - ${r.repartidores.nombre}`;
      }
      if ((r.tipo_reparto === tipoParadaEnum.Values.retiro_empresa || r.tipo_reparto === 'viaje_empresa_lote' || r.tipo_reparto === 'viaje_empresa') && r.empresas?.nombre) {
        label += ` (${r.empresas.nombre})`;
      }
      return {
        id: r.id,
        label: label,
        // Store empresa details if needed by summary component
        empresa_id: r.empresas?.id || null,
        empresa_nombre: r.empresas?.nombre || null,
        tipo_reparto: r.tipo_reparto as TipoParadaEnumType | null, // Cast for clarity
      };
    });

    return { data: repartosParaFiltro, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getRepartosForMapFilterAction:", err.message);
    return { data: [], error: "Error inesperado al obtener repartos para el filtro." };
  }
}
