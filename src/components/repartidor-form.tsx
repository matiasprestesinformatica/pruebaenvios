
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { RepartidorFormData } from "@/lib/schemas";
import { repartidorSchema } from "@/lib/schemas";
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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface RepartidorFormProps {
  onSubmit: (data: RepartidorFormData) => Promise<void>;
  initialData?: Partial<RepartidorFormData>;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function RepartidorForm({
  onSubmit,
  initialData,
  isSubmitting = false,
  submitButtonText = "Guardar Repartidor",
}: RepartidorFormProps) {
  const form = useForm<RepartidorFormData>({
    resolver: zodResolver(repartidorSchema),
    defaultValues: initialData || {
      nombre: "",
      estado: true,
    },
  });

  const handleFormSubmit = async (data: RepartidorFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del repartidor" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estado"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-card">
              <div className="space-y-0.5">
                <FormLabel>Estado</FormLabel>
                <FormDescription>
                  Indica si el repartidor está activo o inactivo.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
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
