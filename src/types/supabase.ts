
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
      empresas: {
        Row: {
          id: string
          created_at: string
          nombre: string
          direccion: string | null
          telefono: string | null
          email: string | null
          notas: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          nombre: string
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          notas?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          nombre?: string
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          notas?: string | null
        }
      }
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
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
        }
      }
      envios: {
        Row: {
          id: string
          created_at: string
          cliente_id: string | null 
          nombre_cliente_temporal: string | null 
          client_location: string
          package_size: string 
          package_weight: number 
          status: string 
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
      repartidores: {
        Row: {
          id: string
          created_at: string
          nombre: string
          estado: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          nombre: string
          estado?: boolean 
        }
        Update: {
          id?: string
          created_at?: string
          nombre?: string
          estado?: boolean
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
export type Empresa = Database['public']['Tables']['empresas']['Row'];
export type NuevaEmpresa = Database['public']['Tables']['empresas']['Insert'];
export type Cliente = Database['public']['Tables']['clientes']['Row'];
export type NuevoCliente = Database['public']['Tables']['clientes']['Insert'];
export type Envio = Database['public']['Tables']['envios']['Row'];
export type NuevoEnvio = Database['public']['Tables']['envios']['Insert'];
export type Repartidor = Database['public']['Tables']['repartidores']['Row'];
export type NuevoRepartidor = Database['public']['Tables']['repartidores']['Insert'];
