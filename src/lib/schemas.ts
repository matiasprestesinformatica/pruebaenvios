
import { z } from 'zod';

export const empresaSchema = z.object({
  nombre: z.string().min(1, "El nombre de la empresa es obligatorio."),
  direccion: z.string().optional().nullable(),
  telefono: z.string().regex(/^\+?[0-9\s-()]{7,20}$/, "Formato de teléfono inválido.").optional().nullable().or(z.literal('')),
  email: z.string().email("Formato de email inválido.").optional().nullable().or(z.literal('')),
  notas: z.string().optional().nullable(),
});
export type EmpresaFormData = z.infer<typeof empresaSchema>;

export const clientSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  apellido: z.string().min(1, "El apellido es obligatorio."),
  direccion: z.string().min(1, "La dirección es obligatoria."),
  telefono: z.string().min(1, "El teléfono es obligatorio.").regex(/^\+?[0-9\s-()]{7,20}$/, "Formato de teléfono inválido."),
  email: z.string().min(1, "El email es obligatorio.").email("Formato de email inválido."),
  notas: z.string().optional().nullable(),
  empresa_id: z.string().uuid("ID de empresa inválido.").optional().nullable(),
});

export type ClientFormData = z.infer<typeof clientSchema>;


export const shipmentSchema = z.object({
  cliente_id: z.string().optional(), 
  nombre_cliente_temporal: z.string().optional(),
  client_location: z.string().min(1, "La ubicación del cliente es obligatoria."),
  package_size: z.enum(['small', 'medium', 'large'], {
    errorMap: () => ({ message: "Debe seleccionar un tamaño de paquete." })
  }),
  package_weight: z.coerce.number().min(0.1, "El peso del paquete debe ser mayor a 0."),
});

export type ShipmentFormData = z.infer<typeof shipmentSchema>;

export const repartidorSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  estado: z.boolean().default(true),
});
export type RepartidorFormData = z.infer<typeof repartidorSchema>;

export const estadoRepartoEnum = z.enum(['asignado', 'en_curso', 'completado']);
export type EstadoReparto = z.infer<typeof estadoRepartoEnum>;

export const tipoRepartoEnum = z.enum(['individual', 'viaje_empresa']);
export type TipoReparto = z.infer<typeof tipoRepartoEnum>;

export const repartoCreationSchema = z.object({
  fecha_reparto: z.date({
    required_error: "La fecha de reparto es obligatoria.",
    invalid_type_error: "Formato de fecha inválido.",
  }),
  repartidor_id: z.string().uuid("Debe seleccionar un repartidor."),
  tipo_reparto: tipoRepartoEnum,
  empresa_id: z.string().uuid("Debe seleccionar una empresa para este tipo de reparto.").optional().nullable(),
  envio_ids: z.array(z.string().uuid()).min(1, "Debe seleccionar al menos un envío."),
});
export type RepartoCreationFormData = z.infer<typeof repartoCreationSchema>;

export const estadoEnvioEnum = z.enum(['pending', 'suggested', 'asignado_a_reparto', 'en_transito', 'entregado', 'cancelado', 'problema_entrega']);
export type EstadoEnvio = z.infer<typeof estadoEnvioEnum>;
