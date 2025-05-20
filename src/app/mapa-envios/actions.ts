
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EnvioMapa, Reparto, Repartidor, RepartoParaFiltro, Envio, Cliente, Empresa } from "@/types/supabase"; // Added Empresa
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
type ParadaConEnvioYClienteParaMapa = Database['public']['Tables']['paradas_reparto']['Row'] & {
    envio: (Envio & { clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido'> | null }) | null;
};
type RepartoConEmpresa = Reparto & { empresas: Pick<Empresa, 'id' | 'nombre' | 'direccion' | 'latitud' | 'longitud'> | null };


export async function getEnviosGeolocalizadosAction(
  repartoId?: string | null
): Promise<{ data: EnvioMapa[]; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    let enviosMapa: EnvioMapa[] = [];

    if (repartoId && repartoId !== "all" && repartoId !== "unassigned") {
      // Fetch the reparto to get empresa details if it's a lote/empresa type
      const { data: repartoData, error: repartoError } = await supabase
        .from('repartos')
        .select('*, empresas (id, nombre, direccion, latitud, longitud)')
        .eq('id', repartoId)
        .single();

      if (repartoError || !repartoData) {
        console.error("Error fetching reparto for map view or reparto not found:", repartoError);
        return { data: [], error: "No se pudo encontrar el reparto especificado." };
      }
      const typedRepartoData = repartoData as RepartoConEmpresa;


      // Fetch ordered paradas for the specific reparto
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
          )
        `)
        .eq("reparto_id", repartoId)
        .order("orden", { ascending: true });

      if (paradasError) {
        const pgError = paradasError as PostgrestError;
        console.error("Error fetching paradas_reparto for map:", JSON.stringify(pgError, null, 2));
        return { data: [], error: `Error al cargar paradas del reparto: ${pgError.message}` };
      }

      enviosMapa = (paradasData as ParadaConEnvioYClienteParaMapa[] || []).map(parada => {
        if (parada.tipo_parada === tipoParadaEnum.Values.retiro_empresa && typedRepartoData.empresas && typedRepartoData.empresas.latitud && typedRepartoData.empresas.longitud) {
          // This is the company pickup point
          return {
            id: `pickup-${typedRepartoData.empresas.id}-${parada.id}`, // Unique ID for the pickup point marker
            latitud: typedRepartoData.empresas.latitud,
            longitud: typedRepartoData.empresas.longitud,
            status: 'pickup', // Special status for map differentiation
            nombre_cliente: typedRepartoData.empresas.nombre,
            client_location: typedRepartoData.empresas.direccion || 'Dirección de empresa no disponible',
            package_size: null,
            package_weight: null,
            orden: parada.orden,
            tipo_parada: tipoParadaEnum.Values.retiro_empresa,
          };
        } else if (parada.envio && parada.envio.latitud && parada.envio.longitud &&
                   parada.envio.latitud >= MDP_BOUNDS.minLat && parada.envio.latitud <= MDP_BOUNDS.maxLat &&
                   parada.envio.longitud >= MDP_BOUNDS.minLng && parada.envio.longitud <= MDP_BOUNDS.maxLng) {
          // This is a regular client delivery
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
        return null; // Exclude paradas that don't fit criteria (e.g., pickup point for company without coords, or envio outside MDP)
      }).filter(Boolean) as EnvioMapa[];

    } else { // "all" or "unassigned"
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
        orden: null,
        tipo_parada: tipoParadaEnum.Values.entrega_cliente, // Assume entrega_cliente for these general queries
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
      tipo_parada: tipoParadaEnum.Values.entrega_cliente, // Default for unassigned
    }));

    return { data: enviosMapa, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEnviosNoAsignadosGeolocalizadosAction:", err.message);
    return { data: [], error: "Error inesperado al obtener envíos no asignados." };
  }
}

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

