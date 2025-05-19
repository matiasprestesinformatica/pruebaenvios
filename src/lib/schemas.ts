
import { z } from 'zod';

export const clientSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  apellido: z.string().min(1, "El apellido es obligatorio."),
  direccion: z.string().min(1, "La dirección es obligatoria."),
  telefono: z.string().min(1, "El teléfono es obligatorio.").regex(/^\+?[0-9\s-()]{7,20}$/, "Formato de teléfono inválido."),
  email: z.string().min(1, "El email es obligatorio.").email("Formato de email inválido."),
  notas: z.string().optional(),
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
