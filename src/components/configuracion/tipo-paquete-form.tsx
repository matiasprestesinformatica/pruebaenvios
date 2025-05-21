
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { TipoPaqueteFormData } from "@/lib/schemas";
import { tipoPaqueteSchema } from "@/lib/schemas";
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

interface TipoPaqueteFormProps {
  onSubmit: (data: TipoPaqueteFormData) => Promise<void>;
  initialData?: Partial<TipoPaqueteFormData>;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function TipoPaqueteForm({
  onSubmit,
  initialData,
  isSubmitting = false,
  submitButtonText = "Guardar Tipo de Paquete",
}: TipoPaqueteFormProps) {
  const form = useForm<TipoPaqueteFormData>({
    resolver: zodResolver(tipoPaqueteSchema),
    defaultValues: initialData || {
      nombre: "",
      descripcion: "",
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
              <FormLabel>Nombre del Tipo de Paquete</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Caja Mediana, Documentos" {...field} />
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
                  placeholder="Detalles sobre este tipo de paquete..."
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
          name="activo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-card">
              <div className="space-y-0.5">
                <FormLabel>Estado Activo</FormLabel>
                <FormDescription>
                  Indica si este tipo de paquete está activo y puede ser utilizado.
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
    
    