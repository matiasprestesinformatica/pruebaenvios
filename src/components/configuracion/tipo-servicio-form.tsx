
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { TipoServicioFormData } from "@/lib/schemas";
import { tipoServicioSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface TipoServicioFormProps {
  onSubmit: (data: TipoServicioFormData) => Promise<void>;
  initialData?: Partial<TipoServicioFormData>;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function TipoServicioForm({
  onSubmit,
  initialData,
  isSubmitting = false,
  submitButtonText = "Guardar Tipo de Servicio",
}: TipoServicioFormProps) {
  const form = useForm<TipoServicioFormData>({
    resolver: zodResolver(tipoServicioSchema),
    defaultValues: initialData || {
      nombre: "",
      descripcion: "",
      precio_base: null, // Initialize as null for optional number
      activo: true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Tipo de Servicio</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Envío Express, Moto Fija" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalles sobre este tipo de servicio..."
                  className="resize-none"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="precio_base"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Precio Base (Opcional)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="Ej: 1500.00" 
                  {...field} 
                  value={field.value === null || field.value === undefined ? "" : field.value}
                  onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                />
              </FormControl>
              <FormDescription>Precio base para este servicio. Puede ser ajustado por otros factores.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="activo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-card">
              <div className="space-y-0.5">
                <FormLabel>Estado Activo</FormLabel>
                <FormDescription>
                  Indica si este tipo de servicio está activo y puede ser ofrecido.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Estado Activo"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            submitButtonText
          )}
        </Button>
      </form>
    </Form>
  );
}
    
    