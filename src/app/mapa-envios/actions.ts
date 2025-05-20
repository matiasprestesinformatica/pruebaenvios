
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EnvioMapa, RepartoConDetalles, EnvioConCliente, RepartoParaFiltro, Reparto, Repartidor } from "@/types/supabase";
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

export async function getEnviosGeolocalizadosAction(
  repartoId?: string | null
): Promise<{ data: EnvioMapa[]; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    let query = supabase
      .from("envios")
      .select("*, clientes (id, nombre, apellido)") 
      .not("latitud", "is", null)
      .not("longitud", "is", null)
      .gte("latitud", MDP_BOUNDS.minLat)
      .lte("latitud", MDP_BOUNDS.maxLat)
      .gte("longitud", MDP_BOUNDS.minLng)
      .lte("longitud", MDP_BOUNDS.maxLng);

    if (repartoId && repartoId !== "all") {
      if (repartoId === "unassigned") {
        query = query.is("reparto_id", null);
      } else {
        query = query.eq("reparto_id", repartoId);
      }
    }

    query = query.order("created_at", { ascending: false });
    
    const { data, error } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching geolocated envios:", JSON.stringify(pgError, null, 2));
      let errorMessage = "Ocurrió un error al cargar los envíos para el mapa.";
       if (Object.keys(pgError).length === 0 && typeof pgError === 'object') {
        errorMessage = "Error de conexión o configuración con Supabase al obtener envíos geolocalizados. Verifique RLS.";
      } else if (pgError.message) {
        errorMessage = pgError.message;
      }
      return { data: [], error: errorMessage };
    }

    const enviosMapa: EnvioMapa[] = (data || []).map(envio => ({
      id: envio.id,
      latitud: envio.latitud as number, 
      longitud: envio.longitud as number, 
      status: envio.status,
      nombre_cliente: envio.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}` : envio.nombre_cliente_temporal,
      client_location: envio.client_location,
      package_size: envio.package_size,
      package_weight: envio.package_weight,
    }));

    return { data: enviosMapa, error: null };

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEnviosGeolocalizadosAction:", err.message);
    return { data: [], error: "Error inesperado en el servidor al obtener envíos para el mapa." };
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
      .select("id, fecha_reparto, repartidores (nombre)") // Select only needed fields
      .order("fecha_reparto", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20); 

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Error fetching repartos for map filter:", JSON.stringify(pgError, null, 2));
      return { data: [], error: "No se pudieron cargar los repartos para el filtro." };
    }
    
    // Use the more specific type and handle potential null data
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
