
"use server";

import { revalidatePath } from "next/cache";
import type { ClientFormData } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/schemas";

export async function addClientAction(
  data: ClientFormData
): Promise<{ success: boolean; error?: string | null; data?: any }> {
  const supabase = createSupabaseServerClient();

  const validatedFields = clientSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
    };
  }
  
  const { data: client, error } = await supabase
    .from("clientes")
    .insert(validatedFields.data)
    .select()
    .single();

  if (error) {
    console.error("Error inserting client:", error);
    // Check for unique constraint violation (e.g., email)
    if (error.code === '23505') { // Postgres unique violation error code
        return { success: false, error: "Ya existe un cliente con este email." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/clientes"); // Revalidate the clients page to show the new client
  return { success: true, data: client };
}

export async function getClientsAction(page = 1, pageSize = 10, searchTerm?: string) {
  const supabase = createSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("clientes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchTerm) {
    query = query.or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }
  
  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching clients:", error);
    return { data: [], count: 0, error: error.message };
  }
  return { data: data || [], count: count || 0, error: null };
}
