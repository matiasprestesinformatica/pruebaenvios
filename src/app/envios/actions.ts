
"use server";

import { revalidatePath } from "next/cache";
import type { ShipmentFormData } from "@/lib/schemas";
import { shipmentSchema, estadoEnvioEnum } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { suggestDeliveryOptions, type SuggestDeliveryOptionsOutput } from "@/ai/flows/suggest-delivery-options";
import type { NuevoEnvio, Envio, EnvioConCliente, Cliente } from "@/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

export async function suggestDeliveryOptionsAction(
  data: ShipmentFormData
): Promise<SuggestDeliveryOptionsOutput | null> {
  const validatedFields = shipmentSchema.safeParse(data);
  if (!validatedFields.success) {
    console.error("Validation error for AI suggestion:", validatedFields.error.flatten().fieldErrors);
    return null; 
  }

  try {
    const aiInput = {
      clientLocation: validatedFields.data.client_location,
      packageSize: validatedFields.data.package_size,
      packageWeight: validatedFields.data.package_weight,
    };
    const suggestions = await suggestDeliveryOptions(aiInput);
    return suggestions;
  } catch (error) {
    console.error("Error calling suggestDeliveryOptions AI flow:", error);
    return null; 
  }
}


export async function createShipmentAction(
  formData: ShipmentFormData,
  aiSuggestions?: SuggestDeliveryOptionsOutput
): Promise<{ success: boolean; error?: string | null; data?: Envio | null }> {
  const supabase = createSupabaseServerClient();

  const validatedFields = shipmentSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
      data: null,
    };
  }

  const shipmentData: NuevoEnvio = {
    cliente_id: validatedFields.data.cliente_id || null,
    nombre_cliente_temporal: validatedFields.data.nombre_cliente_temporal || null,
    client_location: validatedFields.data.client_location,
    package_size: validatedFields.data.package_size,
    package_weight: validatedFields.data.package_weight,
    status: aiSuggestions ? estadoEnvioEnum.Values.suggested : estadoEnvioEnum.Values.pending, 
    suggested_options: aiSuggestions ? aiSuggestions.suggestedOptions : null,
    reasoning: aiSuggestions ? aiSuggestions.reasoning : null,
  };
  
  try {
    const { data: newShipment, error } = await supabase
      .from("envios")
      .insert(shipmentData)
      .select()
      .single();

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Supabase error object while inserting shipment:", JSON.stringify(pgError, null, 2));
      let errorMessage = "No se pudo registrar el envío.";
      if (pgError.message) {
          errorMessage = pgError.message;
      }
      return { success: false, error: errorMessage, data: null };
    }

    revalidatePath("/envios"); 
    revalidatePath("/envios/nuevo");
    return { success: true, data: newShipment, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in createShipmentAction:", err);
    return {
      success: false,
      error: err.message || 'Error desconocido del servidor al crear el envío.',
      data: null,
    };
  }
}

export async function getClientesForShipmentFormAction(): Promise<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'email'>[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, apellido, email")
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true });
  
    if (error) {
      console.error("Error fetching clients for shipment form:", error);
      return [];
    }
    return data || [];
}

export async function getEnviosAction(page = 1, pageSize = 10, searchTerm?: string): Promise<{ data: EnvioConCliente[]; count: number; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("envios")
      .select("*, clientes (id, nombre, apellido, direccion, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (searchTerm) {
      // Simplified search: removed filtering on clientes.nombre and clientes.apellido
      // This is a diagnostic step. If it resolves the ISE, a more robust search on related fields will be needed.
      const searchConditions = [
        `client_location.ilike.%${searchTerm}%`,
        `nombre_cliente_temporal.ilike.%${searchTerm}%`,
        `status.ilike.%${searchTerm}%`
      ];
      // Only add client-related search if we can confirm cliente_id is being used for search
      // For now, keeping it simple to avoid ISE.
      // A more complex solution would involve checking if searchTerm can be parsed as UUID for cliente_id
      // or dynamically building the OR query based on client table structure.
      
      // If you want to re-enable search on client fields, you'd add:
      // `clientes.nombre.ilike.%${searchTerm}%`,
      // `clientes.apellido.ilike.%${searchTerm}%`
      // to the OR condition, but ensure this is handled robustly if `clientes` can be null.
      query = query.or(searchConditions.join(','));
    }
    
    const { data, error, count } = await query;

    if (error) {
      const pgError = error as PostgrestError;
      console.error("Supabase error object while fetching envios:", JSON.stringify(pgError, null, 2));
      let errorMessage = "Ocurrió un error al cargar los envíos.";
      if (pgError.message) {
        errorMessage = pgError.message;
      }
      return { data: [], count: 0, error: errorMessage };
    }
    return { data: (data as EnvioConCliente[]) || [], count: count || 0, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Unexpected error in getEnviosAction:", err);
    return { data: [], count: 0, error: err.message || 'Error desconocido del servidor al obtener envíos.' };
  }
}
