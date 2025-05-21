
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
          direccion: string
          latitud: number | null
          longitud: number | null
          telefono: string | null
          email: string | null
          notas: string | null
          estado: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          nombre: string
          direccion: string
          latitud?: number | null
          longitud?: number | null
          telefono?: string | null
          email?: string | null
          notas?: string | null
          estado?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          nombre?: string
          direccion?: string
          latitud?: number | null
          longitud?: number | null
          telefono?: string | null
          email?: string | null
          notas?: string | null
          estado?: boolean
        }
      }
      clientes: {
        Row: {
          id: string
          created_at: string
          nombre: string
          apellido: string
          direccion: string
          latitud: number | null
          longitud: number | null
          telefono: string | null
          email: string | null
          notas: string | null
          empresa_id: string | null
          estado: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          nombre: string
          apellido: string
          direccion: string
          latitud?: number | null
          longitud?: number | null
          telefono?: string | null
          email?: string | null
          notas?: string | null
          empresa_id?: string | null
          estado?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          nombre?: string
          apellido?: string
          direccion?: string
          latitud?: number | null
          longitud?: number | null
          telefono?: string | null
          email?: string | null
          notas?: string | null
          empresa_id?: string | null
          estado?: boolean
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
      tipos_paquete: { // Nuevo
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          activo?: boolean
          created_at?: string
        }
      }
      tipos_servicio: { // Nuevo
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          precio_base: number | null
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          precio_base?: number | null
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          precio_base?: number | null
          activo?: boolean
          created_at?: string
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
          repartidor_id?: string | null
          estado: string
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
          latitud: number | null
          longitud: number | null
          package_size: string 
          package_weight: number
          status: string 
          suggested_options: Json | null
          reasoning: string | null
          reparto_id: string | null
          // tipo_paquete_id: string | null // Futuro
          // tipo_servicio_id: string | null // Futuro
        }
        Insert: {
          id?: string
          created_at?: string
          cliente_id?: string | null
          nombre_cliente_temporal?: string | null
          client_location: string
          latitud?: number | null
          longitud?: number | null
          package_size: string
          package_weight?: number
          status: string
          suggested_options?: Json | null
          reasoning?: string | null
          reparto_id?: string | null
          // tipo_paquete_id?: string | null
          // tipo_servicio_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          cliente_id?: string | null
          nombre_cliente_temporal?: string | null
          client_location?: string
          latitud?: number | null
          longitud?: number | null
          package_size?: string
          package_weight?: number
          status?: string
          suggested_options?: Json | null
          reasoning?: string | null
          reparto_id?: string | null
          // tipo_paquete_id?: string | null
          // tipo_servicio_id?: string | null
        }
      }
      paradas_reparto: {
        Row: {
          id: string
          reparto_id: string
          envio_id: string | null 
          tipo_parada: Enums<"tipoparadaenum"> | null
          orden: number
          created_at: string
        }
        Insert: {
          id?: string
          reparto_id: string
          envio_id?: string | null
          tipo_parada?: Enums<"tipoparadaenum"> | null
          orden: number
          created_at?: string
        }
        Update: {
          id?: string
          reparto_id?: string
          envio_id?: string | null
          tipo_parada?: Enums<"tipoparadaenum"> | null
          orden?: number
          created_at?: string
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
       tipoparadaenum: "retiro_empresa" | "entrega_cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Empresa = Database['public']['Tables']['empresas']['Row'];
export type NuevaEmpresa = Database['public']['Tables']['empresas']['Insert'];
export type UpdateEmpresa = Database['public']['Tables']['empresas']['Update'];
export type Cliente = Database['public']['Tables']['clientes']['Row'];
export type NuevoCliente = Database['public']['Tables']['clientes']['Insert'];
export type UpdateCliente = Database['public']['Tables']['clientes']['Update'];
export type Repartidor = Database['public']['Tables']['repartidores']['Row'];
export type NuevoRepartidor = Database['public']['Tables']['repartidores']['Insert'];
export type Reparto = Database['public']['Tables']['repartos']['Row'];
export type NuevoReparto = Database['public']['Tables']['repartos']['Insert'];
export type Envio = Database['public']['Tables']['envios']['Row'];
export type NuevoEnvio = Database['public']['Tables']['envios']['Insert'];
export type ParadaReparto = Database['public']['Tables']['paradas_reparto']['Row'];
export type NuevaParadaReparto = Database['public']['Tables']['paradas_reparto']['Insert'];

export type TipoPaquete = Database['public']['Tables']['tipos_paquete']['Row'];
export type NuevoTipoPaquete = Database['public']['Tables']['tipos_paquete']['Insert'];
export type UpdateTipoPaquete = Database['public']['Tables']['tipos_paquete']['Update'];

export type TipoServicio = Database['public']['Tables']['tipos_servicio']['Row'];
export type NuevoTipoServicio = Database['public']['Tables']['tipos_servicio']['Insert'];
export type UpdateTipoServicio = Database['public']['Tables']['tipos_servicio']['Update'];

// Extended types for relations
export type RepartoConDetalles = Reparto & {
  repartidores: Pick<Repartidor, 'id' | 'nombre'> | null;
  empresas: Pick<Empresa, 'id' | 'nombre' | 'direccion' | 'latitud' | 'longitud'> | null;
};

export type EnvioConCliente = Envio & {
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'email' | 'estado' | 'latitud' | 'longitud'> | null;
};

export type ParadaConEnvioYCliente = ParadaReparto & {
  envio: EnvioConCliente | null;
  tipo_parada: Database['public']['Enums']['tipoparadaenum'] | null;
};

export type RepartoCompleto = RepartoConDetalles & {
  paradas: ParadaConEnvioYCliente[];
};

export type ClienteWithEmpresa = Cliente & {
  empresa: Pick<Empresa, 'id' | 'nombre'> | null;
};

export interface EnvioMapa {
  id: string; 
  latitud: number;
  longitud: number;
  status: string | null;
  nombre_cliente: string | null; 
  client_location: string;
  package_size: string | null;
  package_weight: number | null;
  orden?: number | null; 
  tipo_parada?: Database['public']['Enums']['tipoparadaenum'] | null;
}

export interface RepartoParaFiltro {
  id: string;
  label: string;
  empresa_id?: string | null; // Added for summary component
  empresa_nombre?: string | null; // Added for summary component
  tipo_reparto?: string | null; // Added for summary component
}

export type TipoParadaEnum = Database['public']['Enums']['tipoparadaenum'];

// Helper for Zod Enums to be derived from DB Enums if needed, or defined directly
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
    
    
    