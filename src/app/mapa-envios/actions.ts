
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EnvioMapa, EnvioConCliente } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

// Approximate bounding box for Mar del Plata
const MDP_BOUNDS = {
  minLat: -38.15, // South
  maxLat: -37.90, // North
  minLng: -57.70, // West
  maxLng: -57.45, // East
};

export async function getEnviosGeolocalizadosAction(): Promise<{ data: EnvioMapa[]; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("envios")
      .select("*, clientes (id, nombre, apellido)") // Select specific fields from clientes
      .not("latitud", "is", null)
      .not("longitud", "is", null)
      .gte("latitud", MDP_BOUNDS.minLat)
      .lte("latitud", MDP_BOUNDS.maxLat)
      .gte("longitud", MDP_BOUNDS.minLng)
      .lte("longitud", MDP_BOUNDS.maxLng)
      .order("created_at", { ascending: false });

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

    const enviosMapa: EnvioMapa[] = (data as EnvioConCliente[]).map(envio => ({
      id: envio.id,
      latitud: envio.latitud as number, // Asserting not null due to query filters
      longitud: envio.longitud as number, // Asserting not null
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
