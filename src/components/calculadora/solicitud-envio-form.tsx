
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { SolicitudEnvioCalculadoraFormData } from "@/lib/schemas";
import { solicitudEnvioCalculadoraSchema } from "@/lib/schemas";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SolicitudEnvioFormProps {
  initialData: {
    direccionRetiro: string;
    direccionEntrega: string;
    montoACobrar: number;
  };
  initialDestinoCoords?: { lat: number; lng: number } | null; // New prop
  createEnvioAction: (
    data: SolicitudEnvioCalculadoraFormData,
    lat?: number | null, // Optional lat
    lng?: number | null  // Optional lng
  ) => Promise<{ success: boolean; error?: string | null; info?: string | null }>;
  onSolicitudSuccess?: () => void;
}

export function SolicitudEnvioForm({ 
    initialData, 
    initialDestinoCoords, // Use the new prop
    createEnvioAction, 
    onSolicitudSuccess 
}: SolicitudEnvioFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<SolicitudEnvioCalculadoraFormData>({
    resolver: zodResolver(solicitudEnvioCalculadoraSchema),
    defaultValues: {
      nombreEnvia: "",
      telefonoEnvia: "",
      direccionRetiro: initialData.direccionRetiro || "",
      nombreRecibe: "",
      telefonoRecibe: "",
      direccionEntrega: initialData.direccionEntrega || "",
      horarioRetiroDesde: "",
      horarioEntregaHasta: "",
      montoACobrar: initialData.montoACobrar || 0,
      detallesAdicionales: "",
    },
  });

  const handleFormSubmit = async (data: SolicitudEnvioCalculadoraFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createEnvioAction(
        data,
        initialDestinoCoords?.lat,
        initialDestinoCoords?.lng
      );
      if (result.success) {
        toast({
          title: "Solicitud de Envío Creada",
          description: result.info || "Tu solicitud de envío ha sido creada exitosamente. Un operador se comunicará pronto.",
        });
        form.reset();
        if (onSolicitudSuccess) {
          onSolicitudSuccess();
        }
      } else {
        toast({
          title: "Error al Crear Solicitud",
          description: result.error || "No se pudo procesar tu solicitud. Intenta nuevamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
      console.error("Error creating shipment from calculator form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Confirmar y Solicitar Envío Express</CardTitle>
        <CardDescription>
          Completa los siguientes datos para finalizar tu solicitud de envío. El monto y las direcciones han sido pre-cargados desde el cotizador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <fieldset className="space-y-4 p-4 border rounded-md">
                <legend className="text-sm font-medium px-1 -ml-1">Datos del Remitente</legend>
                <FormField control={form.control} name="nombreEnvia" render={({ field }) => (<FormItem><FormLabel>Nombre de quien envía <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="Juan Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="telefonoEnvia" render={({ field }) => (<FormItem><FormLabel>Teléfono <span className="text-destructive">*</span></FormLabel><FormControl><Input type="tel" placeholder="(000) 000-00-00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="direccionRetiro" render={({ field }) => (<FormItem><FormLabel>Dirección de retiro <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly className="bg-muted/50" /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="horarioRetiroDesde" render={({ field }) => (<FormItem><FormLabel>Horario de retiro (desde) <span className="text-destructive">*</span></FormLabel><FormControl><Input type="time" placeholder="09:00" {...field} /></FormControl><FormDescription>Desde qué hora se puede retirar.</FormDescription><FormMessage /></FormItem>)} />
              </fieldset>

              <fieldset className="space-y-4 p-4 border rounded-md">
                <legend className="text-sm font-medium px-1 -ml-1">Datos del Destinatario</legend>
                <FormField control={form.control} name="nombreRecibe" render={({ field }) => (<FormItem><FormLabel>Nombre de quien recibe <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="Matias" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="telefonoRecibe" render={({ field }) => (<FormItem><FormLabel>Teléfono <span className="text-destructive">*</span></FormLabel><FormControl><Input type="tel" placeholder="(000) 000-00-00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="direccionEntrega" render={({ field }) => (<FormItem><FormLabel>Dirección de entrega <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly className="bg-muted/50" /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="horarioEntregaHasta" render={({ field }) => (<FormItem><FormLabel>Horario límite de entrega <span className="text-destructive">*</span></FormLabel><FormControl><Input type="time" placeholder="18:00" {...field} /></FormControl><FormDescription>Hasta qué hora se puede entregar.</FormDescription><FormMessage /></FormItem>)} />
              </fieldset>
            </div>
            
            <FormField control={form.control} name="montoACobrar" render={({ field }) => (<FormItem><FormLabel>Monto a cobrar (cotizado) <span className="text-destructive">*</span></FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-muted/50 font-semibold" /></FormControl><FormMessage /></FormItem>)} />
            
            <FormField
              control={form.control}
              name="detallesAdicionales"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalles adicionales</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Dejar en portería, paquete frágil, etc." className="resize-y min-h-[80px]" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-center text-sm text-muted-foreground mt-4">
              Una vez recibido el pedido, un operador se comunicará vía WhatsApp para confirmar y compartir el seguimiento.
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : <><Send className="mr-2 h-4 w-4" /> Hacer Pedido</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    