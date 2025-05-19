
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
      repartos: {
        Row: {
          id: string
          created_at: string
          fecha_reparto: string 
          repartidor_id: string | null
          estado: string 
          tipo_reparto: string 
          empresa_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          fecha_reparto: string
          repartidor_id: string | null
          estado?: string
          tipo_reparto: string
          empresa_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          fecha_reparto?: string
          repartidor_id?: string | null
          estado?: string
          tipo_reparto?: string
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
          reparto_id: string | null
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
          reparto_id?: string | null
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
          reparto_id?: string | null
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
export type Repartidor = Database['public']['Tables']['repartidores']['Row'];
export type NuevoRepartidor = Database['public']['Tables']['repartidores']['Insert'];
export type Reparto = Database['public']['Tables']['repartos']['Row'];
export type NuevoReparto = Database['public']['Tables']['repartos']['Insert'];
export type Envio = Database['public']['Tables']['envios']['Row'];
export type NuevoEnvio = Database['public']['Tables']['envios']['Insert'];

// Extended types for relations
export type RepartoConDetalles = Reparto & {
  repartidores: Pick<Repartidor, 'id' | 'nombre'> | null;
  empresas: Pick<Empresa, 'id' | 'nombre'> | null;
};

export type EnvioConCliente = Envio & {
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'email'> | null;
};

export type RepartoCompleto = RepartoConDetalles & {
  envios_asignados: EnvioConCliente[];
};

export type ClienteWithEmpresa = Cliente & {
  empresa: Pick<Empresa, 'id' | 'nombre'> | null;
};
