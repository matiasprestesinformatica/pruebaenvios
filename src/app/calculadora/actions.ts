
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TarifaDistanciaCalculadora, TipoCalculadoraServicioEnum } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

export async function getTarifasCalculadoraAction(
  tipoCalculadora: TipoCalculadoraServicioEnum
): Promise<{ data: TarifaDistanciaCalculadora[]; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Find the most recent fecha_vigencia_desde that is on or before today
    const { data: distinctDates, error: dateError } = await supabase
      .from('tarifas_distancia_calculadora')
      .select('fecha_vigencia_desde')
      .eq('tipo_calculadora', tipoCalculadora)
      .lte('fecha_vigencia_desde', today)
      .order('fecha_vigencia_desde', { ascending: false })
      .limit(1);

    if (dateError) {
      console.error(`Error fetching distinct vigencia dates for ${tipoCalculadora}:`, dateError);
      return { data: [], error: `Error al obtener fechas de vigencia: ${(dateError as PostgrestError).message}` };
    }

    if (!distinctDates || distinctDates.length === 0) {
      // No active tariffs found for today or earlier
      return { data: [], error: `No se encontraron tarifas vigentes para el servicio ${tipoCalculadora}.` };
    }

    const latestValidDate = distinctDates[0].fecha_vigencia_desde;

    // 2. Fetch all tariffs for that specific tipo_calculadora and latestValidDate
    const { data: tarifas, error: tarifasError } = await supabase
      .from('tarifas_distancia_calculadora')
      .select('*')
      .eq('tipo_calculadora', tipoCalculadora)
      .eq('fecha_vigencia_desde', latestValidDate)
      .order('distancia_hasta_km', { ascending: true });

    if (tarifasError) {
      console.error(`Error fetching tariffs for ${tipoCalculadora} on ${latestValidDate}:`, tarifasError);
      return { data: [], error: `Error al obtener tarifas: ${(tarifasError as PostgrestError).message}` };
    }

    return { data: tarifas || [], error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error(`Unexpected error in getTarifasCalculadoraAction for ${tipoCalculadora}:`, err);
    return { data: [], error: err.message || "Error desconocido del servidor al obtener tarifas." };
  }
}
