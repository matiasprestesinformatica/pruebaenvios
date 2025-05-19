
"use server";

import { revalidatePath } from "next/cache";
import type { ShipmentFormData } from "@/lib/schemas";
import { shipmentSchema } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { suggestDeliveryOptions, type SuggestDeliveryOptionsOutput } from "@/ai/flows/suggest-delivery-options";
import type { NuevoEnvio } from "@/types/supabase";

export async function suggestDeliveryOptionsAction(
  data: ShipmentFormData
): Promise<SuggestDeliveryOptionsOutput | null> {
  const validatedFields = shipmentSchema.safeParse(data);
  if (!validatedFields.success) {
    console.error("Validation error for AI suggestion:", validatedFields.error.flatten().fieldErrors);
    // Optionally, you could throw an error or return a specific error structure
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
    return null; // Or throw / return error structure
  }
}


export async function createShipmentAction(
  formData: ShipmentFormData,
  aiSuggestions?: SuggestDeliveryOptionsOutput
): Promise<{ success: boolean; error?: string | null; data?: any }> {
  const supabase = createSupabaseServerClient();

  const validatedFields = shipmentSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
    };
  }

  const shipmentData: NuevoEnvio = {
    cliente_id: validatedFields.data.cliente_id || null,
    nombre_cliente_temporal: validatedFields.data.nombre_cliente_temporal || null,
    client_location: validatedFields.data.client_location,
    package_size: validatedFields.data.package_size,
    package_weight: validatedFields.data.package_weight,
    status: aiSuggestions ? 'suggested' : 'pending', // Initial status
    suggested_options: aiSuggestions ? aiSuggestions.suggestedOptions : null,
    reasoning: aiSuggestions ? aiSuggestions.reasoning : null,
  };
  
  const { data: newShipment, error } = await supabase
    .from("envios")
    .insert(shipmentData)
    .select()
    .single();

  if (error) {
    console.error("Error inserting shipment:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/envios"); 
  revalidatePath("/envios/nuevo");
  return { success: true, data: newShipment };
}

export async function getClientesForShipmentFormAction() {
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
