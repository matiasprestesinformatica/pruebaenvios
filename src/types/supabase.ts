
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
      tipos_paquete: {
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
      tipos_servicio: {
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
          tipo_paquete_id: string | null // Changed from package_size
          package_weight: number
          status: string
          suggested_options: Json | null
          reasoning: string | null
          reparto_id: string | null
          tipo_servicio_id: string | null
          precio_servicio_final: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          cliente_id?: string | null
          nombre_cliente_temporal?: string | null
          client_location: string
          latitud?: number | null
          longitud?: number | null
          tipo_paquete_id?: string | null // Changed from package_size
          package_weight?: number
          status: string
          suggested_options?: Json | null
          reasoning?: string | null
          reparto_id?: string | null
          tipo_servicio_id?: string | null
          precio_servicio_final?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          cliente_id?: string | null
          nombre_cliente_temporal?: string | null
          client_location?: string
          latitud?: number | null
          longitud?: number | null
          tipo_paquete_id?: string | null // Changed from package_size
          package_weight?: number
          status?: string
          suggested_options?: Json | null
          reasoning?: string | null
          reparto_id?: string | null
          tipo_servicio_id?: string | null
          precio_servicio_final?: number | null
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
      // Other enums are handled by Zod at application level as columns are TEXT
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

export type Reparto = Database['public']['Tables']['repartos']['Row'];

export type Envio = Database['public']['Tables']['envios']['Row'];
export type NuevoEnvio = Database['public']['Tables']['envios']['Insert'];
export type UpdateEnvio = Database['public']['Tables']['envios']['Update'];

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
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'email' | 'telefono' | 'latitud' | 'longitud' | 'estado'> | null;
  tipos_paquete?: Pick<TipoPaquete, 'nombre'> | null; // For displaying tipo_paquete name
};

export type EnvioParaDetalleReparto = Envio & {
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'email' | 'telefono'> | null;
  tipos_servicio: Pick<TipoServicio, 'nombre' | 'precio_base'> | null; 
  tipos_paquete: Pick<TipoPaquete, 'nombre'> | null; 
};

export type ParadaConEnvioYCliente = ParadaReparto & {
  envio: EnvioParaDetalleReparto | null;
  tipo_parada: Database['public']['Enums']['tipoparadaenum'] | null,
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
  package_size: string | null; // Kept for compatibility, but should derive from tipo_paquete
  tipo_paquete_nombre?: string | null; // New field for map
  package_weight: number | null;
  orden?: number | null;
  tipo_parada?: Database['public']['Enums']['tipoparadaenum'] | null;
}

export interface RepartoParaFiltro {
  id: string;
  label: string;
  empresa_id?: string | null;
  empresa_nombre?: string | null;
  tipo_reparto?: string | null;
}

export type TipoParadaEnum = Database['public']['Enums']['tipoparadaenum'];

export type EnvioCompletoParaDialog = Envio & {
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'email' | 'telefono' | 'latitud' | 'longitud'> | null;
  repartos: (Pick<Reparto, 'id' | 'fecha_reparto'> & {
      repartidores: Pick<Repartidor, 'nombre'> | null;
  }) | null;
  tipos_servicio: Pick<TipoServicio, 'nombre' | 'precio_base'> | null;
  tipos_paquete: Pick<TipoPaquete, 'nombre'> | null; // For edit dialog
};

export { cn } from "@/lib/utils";
