import { z } from 'zod';

export const empresaSchema = z.object({
  nombre: z.string().min(1, "El nombre de la empresa es obligatorio."),
  direccion: z.string().min(1, "La dirección de la empresa es obligatoria."),
  latitud: z.coerce.number().optional().nullable(),
  longitud: z.coerce.number().optional().nullable(),
  telefono: z.string().regex(/^\+?[0-9\s-()]{7,20}$/, "Formato de teléfono inválido.").optional().nullable().or(z.literal('')),
  email: z.string().email("Formato de email inválido.").optional().nullable().or(z.literal('')),
  notas: z.string().optional().nullable(),
  estado: z.boolean().default(true),
});
export type EmpresaFormData = z.infer<typeof empresaSchema>;

export const clientSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  apellido: z.string().min(1, "El apellido es obligatorio."),
  direccion: z.string().min(1, "La dirección es obligatoria."),
  latitud: z.coerce.number().optional().nullable(),
  longitud: z.coerce.number().optional().nullable(),
  telefono: z.string().regex(/^\+?[0-9\s-()]{7,20}$/, "Formato de teléfono inválido.").optional().nullable().or(z.literal('')),
  email: z.string().email("Formato de email inválido.").optional().nullable().or(z.literal('')),
  notas: z.string().optional().nullable(),
  empresa_id: z.string().uuid("ID de empresa inválido.").optional().nullable(),
  estado: z.boolean().default(true),
});
export type ClientFormData = z.infer<typeof clientSchema>;

export const tipoPaqueteSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(1, "El nombre del tipo de paquete es obligatorio."),
  descripcion: z.string().optional().nullable(),
  activo: z.boolean().default(true),
});
export type TipoPaqueteFormData = z.infer<typeof tipoPaqueteSchema>;

export const tipoServicioSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(1, "El nombre del tipo de servicio es obligatorio."),
  descripcion: z.string().optional().nullable(),
  precio_base: z.coerce.number().min(0, "El precio base no puede ser negativo.").optional().nullable(),
  activo: z.boolean().default(true),
});
export type TipoServicioFormData = z.infer<typeof tipoServicioSchema>;

export const estadoEnvioEnum = z.enum(['pending', 'suggested', 'asignado_a_reparto', 'en_transito', 'entregado', 'cancelado', 'problema_entrega']);
export type EstadoEnvio = z.infer<typeof estadoEnvioEnum>;

export const shipmentSchema = z.object({
  cliente_id: z.string().uuid("ID de cliente inválido.").optional().nullable(),
  nombre_cliente_temporal: z.string().optional().nullable(),
  client_location: z.string().optional().nullable(),
  tipo_paquete_id: z.string().uuid("Debe seleccionar un tipo de paquete.").nullable(),
  package_weight: z.coerce.number().min(0.01, "El peso del paquete debe ser mayor a 0."),
  status: estadoEnvioEnum.optional(),
  tipo_servicio_id: z.string().uuid("ID de tipo de servicio inválido").optional().nullable(),
  precio_servicio_final: z.coerce.number().min(0, "El precio no puede ser negativo.").optional().nullable(),
  notas: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (!data.tipo_paquete_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe seleccionar un tipo de paquete.",
      path: ["tipo_paquete_id"],
    });
  }
  if (data.cliente_id) {
    if (!data.client_location || data.client_location.trim() === "") {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La dirección del cliente seleccionada no pudo ser obtenida o está vacía. Verifique los datos del cliente o ingrese la dirección manualmente deseleccionando el cliente.",
            path: ["client_location"],
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
  if (!data.tipo_servicio_id && (data.precio_servicio_final === null || data.precio_servicio_final === undefined)) {
    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar un tipo de servicio o ingresar un precio final para el servicio.",
        path: ["tipo_servicio_id"],
    });
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

export const tipoParadaEnum = z.enum(['retiro_empresa', 'entrega_cliente']);
export type TipoParada = z.infer<typeof tipoParadaEnum>;

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

export const clienteConServicioLoteSchema = z.object({
  cliente_id: z.string().uuid(),
  tipo_servicio_id_lote: z.string().uuid("ID de tipo de servicio inválido").optional().nullable(),
  precio_manual_lote: z.coerce.number().min(0, "El precio no puede ser negativo.").optional().nullable(),
});
export type ClienteConServicioLoteData = z.infer<typeof clienteConServicioLoteSchema>;

export const repartoLoteCreationSchema = z.object({
  fecha_reparto: z.date({
    required_error: "La fecha de reparto es obligatoria.",
    invalid_type_error: "Formato de fecha inválido.",
  }),
  repartidor_id: z.string().uuid("Debe seleccionar un repartidor."),
  empresa_id: z.string().uuid("Debe seleccionar una empresa."),
  clientes_con_servicio: z.array(clienteConServicioLoteSchema).min(1, "Debe seleccionar al menos un cliente y configurar su servicio."),
});
export type RepartoLoteCreationFormData = z.infer<typeof repartoLoteCreationSchema>;

export const tipoCalculadoraServicioEnum = z.enum(['lowcost', 'express']);
export type TipoCalculadoraServicioFormData = z.infer<typeof tipoCalculadoraServicioEnum>;

export const tarifaDistanciaCalculadoraSchema = z.object({
  id: z.string().uuid().optional(),
  distancia_hasta_km: z.coerce.number().min(0.1, "La distancia debe ser mayor a 0."),
  precio: z.coerce.number().min(0, "El precio no puede ser negativo."),
});
export type TarifaDistanciaCalculadoraFormData = z.infer<typeof tarifaDistanciaCalculadoraSchema>;

export const listaTarifasCalculadoraSchema = z.object({
  fecha_vigencia_desde: z.date({
    required_error: "La fecha de vigencia es obligatoria.",
  }),
  tarifas: z.array(tarifaDistanciaCalculadoraSchema).min(1, "Debe definir al menos un tramo de tarifa."),
});
export type ListaTarifasCalculadoraFormData = z.infer<typeof listaTarifasCalculadoraSchema>;

export const solicitudEnvioCalculadoraSchema = z.object({
  nombreEnvia: z.string().min(1, "El nombre de quien envía es obligatorio."),
  telefonoEnvia: z.string().min(7, "El teléfono de quien envía es obligatorio.").regex(/^\+?[0-9\s-()]{7,20}$/, "Formato de teléfono inválido."),
  direccionRetiro: z.string().min(1, "La dirección de retiro es obligatoria."),
  nombreRecibe: z.string().min(1, "El nombre de quien recibe es obligatorio."),
  telefonoRecibe: z.string().min(7, "El teléfono de quien recibe es obligatorio.").regex(/^\+?[0-9\s-()]{7,20}$/, "Formato de teléfono inválido."),
  direccionEntrega: z.string().min(1, "La dirección de entrega es obligatoria."),
  horarioRetiroDesde: z.string().min(1, "El horario inicial de retiro es obligatorio."),
  horarioEntregaHasta: z.string().min(1, "El horario límite de entrega es obligatorio."),
  montoACobrar: z.coerce.number().min(0, "El monto a cobrar no puede ser negativo."),
  detallesAdicionales: z.string().optional().nullable(),
});
export type SolicitudEnvioCalculadoraFormData = z.infer<typeof solicitudEnvioCalculadoraSchema>;

export const solicitudEnvioIndividualSchema = z.object({
  nombre_cliente: z.string().min(1, "Su nombre completo es obligatorio."),
  email_cliente: z.string().email("Ingrese un email válido.").optional().nullable().or(z.literal('')),
  telefono_cliente: z.string().regex(/^\+?[0-9\s-()]{7,20}$/, "Formato de teléfono inválido.").optional().nullable().or(z.literal('')),
  direccion_retiro: z.string().min(1, "La dirección de retiro es obligatoria."),
  latitud_retiro: z.coerce.number().optional().nullable(),
  longitud_retiro: z.coerce.number().optional().nullable(),
  direccion_entrega: z.string().min(1, "La dirección de entrega es obligatoria."),
  latitud_entrega: z.coerce.number().optional().nullable(),
  longitud_entrega: z.coerce.number().optional().nullable(),
  tipo_paquete_id: z.string().uuid("Debe seleccionar un tipo de paquete.").nullable(),
  descripcion_paquete: z.string().optional().nullable(),
  peso_paquete: z.coerce.number().min(0.01, "El peso debe ser positivo.").optional().nullable(),
  dimensiones_paquete: z.string().optional().nullable(),
  tipo_servicio_id: z.string().uuid().optional().nullable(),
  precio_manual_servicio: z.coerce.number().min(0, "El precio no puede ser negativo.").optional().nullable(),
  notas_cliente: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (!data.tipo_paquete_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe seleccionar un tipo de paquete.",
      path: ["tipo_paquete_id"],
    });
  }
  if (!data.tipo_servicio_id && (data.precio_manual_servicio === null || data.precio_manual_servicio === undefined)) {
    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar un tipo de servicio o ingresar un precio manual.",
        path: ["tipo_servicio_id"], 
    });
  }
});
export type SolicitudEnvioIndividualFormData = z.infer<typeof solicitudEnvioIndividualSchema>;
