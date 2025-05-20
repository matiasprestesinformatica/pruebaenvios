
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EnvioMapa, Reparto, Repartidor, RepartoParaFiltro, Envio, Cliente } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Approximate bounding box for Mar del Plata
const MDP_BOUNDS = {
  minLat: -38.15, // South
  maxLat: -37.90, // North
  minLng: -57.70, // West
  maxLng: -57.45, // East
};

type EnvioConClienteParaMapa = Envio & { clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido'> | null };

export async function getEnviosGeolocalizadosAction(
  repartoId?: string | null
): Promise<{ data: EnvioMapa[]; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    let enviosMapa: EnvioMapa[] = [];

    if (repartoId && repartoId !== "all" && repartoId !== "unassigned") {
      // Fetch ordered shipments for a specific reparto
      const { data: paradasData, error: paradasError } = await supabase
        .from("paradas_reparto")
        .select(`
          orden,
          envio:envios!inner(
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
          )
        `)
        .eq("reparto_id", repartoId)
        .not("envio.latitud", "is", null)
        .not("envio.longitud", "is", null)
        .gte("envio.latitud", MDP_BOUNDS.minLat)
        .lte("envio.latitud", MDP_BOUNDS.maxLat)
        .gte("envio.longitud", MDP_BOUNDS.minLng)
        .lte("envio.longitud", MDP_BOUNDS.maxLng)
        .order("orden", { ascending: true });

      if (paradasError) {
        const pgError = paradasError as PostgrestError;
        console.error("Error fetching paradas_reparto for map:", JSON.stringify(pgError, null, 2));
        return { data: [], error: `Error al cargar paradas del reparto: ${pgError.message}` };
      }

      enviosMapa = (paradasData || []).map(parada => {
        const envioData = parada.envio as EnvioConClienteParaMapa; // Cast to ensure 'clientes' is typed
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
        };
      });

    } else {
      // Fetch all geolocated or unassigned geolocated shipments
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
      // If repartoId is "all" or null/undefined, no further filtering on reparto_id

      const { data: enviosData, error: enviosError } = await query;

      if (enviosError) {
        const pgError = enviosError as PostgrestError;
        console.error("Error fetching envios for map:", JSON.stringify(pgError, null, 2));
        let errorMessage = "Ocurrió un error al cargar los envíos para el mapa.";
        if (Object.keys(pgError).length === 0 && typeof pgError === 'object') {
          errorMessage = "Error de conexión o configuración con Supabase al obtener envíos geolocalizados. Verifique RLS.";
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
        orden: null, // No specific order when fetching all or unassigned this way
      }));
    }
    return { data: enviosMapa, error: null };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEnviosGeolocalizadosAction:", err.message);
    return { data: [], error: "Error inesperado en el servidor al obtener envíos para el mapa." };
  }
}


export async function getEnviosNoAsignadosGeolocalizadosAction(): Promise<{ data: EnvioMapa[]; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    let query = supabase
      .from("envios")
      .select("*, clientes (id, nombre, apellido)")
      .is("reparto_id", null)
      .not("latitud", "is", null)
      .not("longitud", "is", null)
      .gte("latitud", MDP_BOUNDS.minLat)
      .lte("latitud", MDP_BOUNDS.maxLat)
      .gte("longitud", MDP_BOUNDS.minLng)
      .lte("longitud", MDP_BOUNDS.maxLng)
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching unassigned geolocated envios:", JSON.stringify(pgError, null, 2));
      return { data: [], error: `Error al cargar envíos no asignados: ${pgError.message}` };
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
    }));

    return { data: enviosMapa, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEnviosNoAsignadosGeolocalizadosAction:", err.message);
    return { data: [], error: "Error inesperado al obtener envíos no asignados." };
  }
}

// Define a more specific type for the data fetched for the filter
type RepartoDataForFilter = Pick<Reparto, 'id' | 'fecha_reparto'> & {
  repartidores: Pick<Repartidor, 'nombre'> | null;
};

export async function getRepartosForMapFilterAction(): Promise<{ data: RepartoParaFiltro[]; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("repartos")
      .select("id, fecha_reparto, repartidores (nombre)") 
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
      return {
        id: r.id,
        label: label
      };
    });

    return { data: repartosParaFiltro, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getRepartosForMapFilterAction:", err.message);
    return { data: [], error: "Error inesperado al obtener repartos para el filtro." };
  }
}
