
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          created_at: string
          nombre: string
          apellido: string
          direccion: string
          telefono: string
          email: string
          notas: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          nombre: string
          apellido: string
          direccion: string
          telefono: string
          email: string
          notas?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          nombre?: string
          apellido?: string
          direccion?: string
          telefono?: string
          email?: string
          notas?: string | null
        }
      }
      envios: {
        Row: {
          id: string
          created_at: string
          cliente_id: string | null // Can be null if client is not saved yet or direct entry
          nombre_cliente_temporal: string | null // For new clients not yet saved
          client_location: string
          package_size: string // 'small', 'medium', 'large'
          package_weight: number // in kg
          status: string // 'pending', 'suggested', 'confirmed', 'in_transit', 'delivered'
          suggested_options: Json | null
          reasoning: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          cliente_id?: string | null
          nombre_cliente_temporal?: string | null
          client_location: string
          package_size: string
          package_weight: number
          status?: string
          suggested_options?: Json | null
          reasoning?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          cliente_id?: string | null
          nombre_cliente_temporal?: string | null
          client_location?: string
          package_size?: string
          package_weight?: number
          status?: string
          suggested_options?: Json | null
          reasoning?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Cliente = Database['public']['Tables']['clientes']['Row'];
export type NuevoCliente = Database['public']['Tables']['clientes']['Insert'];
export type Envio = Database['public']['Tables']['envios']['Row'];
export type NuevoEnvio = Database['public']['Tables']['envios']['Insert'];
