
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
  cliente_id: z.string().uuid("ID de cliente inválido.").optional().nullable(),
  nombre_cliente_temporal: z.string().optional().nullable(),
  client_location: z.string().optional().nullable(), // Made optional here, refined below
  package_size: z.enum(['small', 'medium', 'large'], {
    errorMap: () => ({ message: "Debe seleccionar un tamaño de paquete." })
  }),
  package_weight: z.coerce.number().min(0.1, "El peso del paquete debe ser mayor a 0."),
}).superRefine((data, ctx) => {
  if (data.cliente_id) {
    if (!data.client_location || data.client_location.trim() === "") {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La dirección del cliente no pudo ser obtenida o está vacía. Verifique los datos del cliente o ingrese la dirección manualmente deseleccionando el cliente.",
            path: ["cliente_id"], 
          });
    }
  } else {
    if (!data.nombre_cliente_temporal || data.nombre_cliente_temporal.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre del cliente es obligatorio si no selecciona uno existente.",
        path: ["nombre_cliente_temporal"],
      });
    }
    if (!data.client_location || data.client_location.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La ubicación del cliente es obligatoria si no selecciona uno existente.",
        path: ["client_location"],
      });
    }
  }
});

export type ShipmentFormData = z.infer<typeof shipmentSchema>;

export const repartidorSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  estado: z.boolean().default(true),
});
export type RepartidorFormData = z.infer<typeof repartidorSchema>;

export const estadoRepartoEnum = z.enum(['asignado', 'en_curso', 'completado']);
export type EstadoReparto = z.infer<typeof estadoRepartoEnum>;

export const tipoRepartoEnum = z.enum(['individual', 'viaje_empresa', 'viaje_empresa_lote']);
export type TipoReparto = z.infer<typeof tipoRepartoEnum>;

export const repartoCreationSchema = z.object({
  fecha_reparto: z.date({
    required_error: "La fecha de reparto es obligatoria.",
    invalid_type_error: "Formato de fecha inválido.",
  }),
  repartidor_id: z.string().uuid("Debe seleccionar un repartidor."),
  tipo_reparto: tipoRepartoEnum.refine(val => val === 'individual' || val === 'viaje_empresa', {
    message: "Tipo de reparto inválido para esta acción."
  }),
  empresa_id: z.string().uuid("Debe seleccionar una empresa para este tipo de reparto.").optional().nullable(),
  envio_ids: z.array(z.string().uuid()).min(1, "Debe seleccionar al menos un envío."),
}).superRefine((data, ctx) => {
  if (data.tipo_reparto === 'viaje_empresa' && !data.empresa_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe seleccionar una empresa para el tipo de reparto 'Viaje por Empresa'.",
      path: ["empresa_id"],
    });
  }
});
export type RepartoCreationFormData = z.infer<typeof repartoCreationSchema>;


export const repartoLoteCreationSchema = z.object({
  fecha_reparto: z.date({
    required_error: "La fecha de reparto es obligatoria.",
    invalid_type_error: "Formato de fecha inválido.",
  }),
  repartidor_id: z.string().uuid("Debe seleccionar un repartidor."),
  empresa_id: z.string().uuid("Debe seleccionar una empresa."),
  cliente_ids: z.array(z.string().uuid()).min(1, "Debe seleccionar al menos un cliente de la empresa."),
  // envio_ids is removed as new shipments will be auto-generated
});
export type RepartoLoteCreationFormData = z.infer<typeof repartoLoteCreationSchema>;


export const estadoEnvioEnum = z.enum(['pending', 'suggested', 'asignado_a_reparto', 'en_transito', 'entregado', 'cancelado', 'problema_entrega']);
export type EstadoEnvio = z.infer<typeof estadoEnvioEnum>;
