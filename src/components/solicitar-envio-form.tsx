
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import type { SolicitudEnvioIndividualFormData } from "@/lib/schemas";
import { solicitudEnvioIndividualSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, User, Mail, Phone, MapPin, Package, Edit, DollarSign, Settings2, InfoIcon, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { TipoPaquete, TipoServicio } from "@/types/supabase";

const NULL_OPTION_PLACEHOLDER = "_NULL_OPTION_";
const MANUAL_PRICE_PLACEHOLDER = "_MANUAL_PRICE_";

interface SolicitudEnvioFormProps {
  tiposPaquete: Pick<TipoPaquete, 'id' | 'nombre'>[];
  tiposServicio: Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[];
  createEnvioIndividualAction: (
    data: SolicitudEnvioIndividualFormData,
    latitud_retiro_provista?: number | null,
    longitud_retiro_provista?: number | null,
    latitud_entrega_provista?: number | null,
    longitud_entrega_provista?: number | null
  ) => Promise<{ success: boolean; error?: string | null; info?: string | null }>;
  initialData: {
    direccion_retiro: string;
    latitud_retiro: number | null;
    longitud_retiro: number | null;
    direccion_entrega: string;
    latitud_entrega: number | null;
    longitud_entrega: number | null;
    precio_cotizado: number | null;
  };
  onSuccess: () => void;
  onBack: () => void; 
}

export function SolicitarEnvioForm({
  tiposPaquete,
  tiposServicio,
  createEnvioIndividualAction,
  initialData,
  onSuccess,
  onBack,
}: SolicitudEnvioFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualPriceInput, setShowManualPriceInput] = useState(false);
  const { toast } = useToast();

  const form = useForm<SolicitudEnvioIndividualFormData>({
    resolver: zodResolver(solicitudEnvioIndividualSchema),
    defaultValues: {
      nombre_cliente: "",
      email_cliente: "",
      telefono_cliente: "",
      direccion_retiro: initialData.direccion_retiro || "",
      latitud_retiro: initialData.latitud_retiro || null,
      longitud_retiro: initialData.longitud_retiro || null,
      direccion_entrega: initialData.direccion_entrega || "",
      latitud_entrega: initialData.latitud_entrega || null,
      longitud_entrega: initialData.longitud_entrega || null,
      tipo_paquete_id: null,
      descripcion_paquete: "",
      peso_paquete: null,
      dimensiones_paquete: "",
      tipo_servicio_id: tiposServicio.find(ts => ts.precio_base === initialData.precio_cotizado && initialData.precio_cotizado !== null)?.id || null,
      precio_manual_servicio: initialData.precio_cotizado,
      notas_cliente: "",
    },
  });
  
  const watchedTipoServicioId = form.watch("tipo_servicio_id");

  useEffect(() => {
    // This effect reacts to changes in the selected service type ID
    const selectedService = tiposServicio.find(s => s.id === watchedTipoServicioId);

    if (watchedTipoServicioId === MANUAL_PRICE_PLACEHOLDER) {
      setShowManualPriceInput(true);
      form.setValue("tipo_servicio_id", null); // Set actual service ID to null for manual price
    } else if (watchedTipoServicioId && watchedTipoServicioId !== NULL_OPTION_PLACEHOLDER) {
      form.setValue("precio_manual_servicio", selectedService?.precio_base ?? initialData.precio_cotizado);
      setShowManualPriceInput(false);
    } else { // NULL_OPTION_PLACEHOLDER (Ninguno) or cleared
      setShowManualPriceInput(false);
      form.setValue("precio_manual_servicio", initialData.precio_cotizado); // Revert to original quoted price
    }
  }, [watchedTipoServicioId, tiposServicio, form, initialData.precio_cotizado]);

  // Initialize showManualPriceInput based on initial data
  useEffect(() => {
    if (initialData.precio_cotizado !== null && 
        !tiposServicio.some(ts => ts.id === form.getValues('tipo_servicio_id') && ts.precio_base === initialData.precio_cotizado) &&
        form.getValues('tipo_servicio_id') !== MANUAL_PRICE_PLACEHOLDER
    ) {
        // If there's an initial price, but no service matches it, and it's not set to manual yet, assume it's manual
        // This case might be rare if a service with matching price_base is auto-selected
    } else if (form.getValues('tipo_servicio_id') === null && initialData.precio_cotizado !== null) {
        // If no service ID is set but there's a price, it's likely manual or pre-quoted
        // If this price isn't from a service, enable manual.
        const serviceMatchingPrice = tiposServicio.find(ts => ts.precio_base === initialData.precio_cotizado);
        if (!serviceMatchingPrice) {
            setShowManualPriceInput(true);
        } else {
            // Auto-select the service if one matches the initial quoted price
            form.setValue('tipo_servicio_id', serviceMatchingPrice.id);
            setShowManualPriceInput(false);
        }
    } else if (form.getValues('tipo_servicio_id') === MANUAL_PRICE_PLACEHOLDER) {
        setShowManualPriceInput(true);
        form.setValue("tipo_servicio_id", null);
    }


  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData.precio_cotizado, tiposServicio, form.getValues('tipo_servicio_id')]);


  const handleFormSubmit = async (data: SolicitudEnvioIndividualFormData) => {
    setIsSubmitting(true);
    try {
      const payload: SolicitudEnvioIndividualFormData = {
        ...data,
        email_cliente: data.email_cliente || null,
        telefono_cliente: data.telefono_cliente || null,
        tipo_paquete_id: data.tipo_paquete_id === NULL_OPTION_PLACEHOLDER ? null : data.tipo_paquete_id,
        descripcion_paquete: data.descripcion_paquete || null,
        peso_paquete: data.peso_paquete || null,
        dimensiones_paquete: data.dimensiones_paquete || null,
        tipo_servicio_id: data.tipo_servicio_id === MANUAL_PRICE_PLACEHOLDER || data.tipo_servicio_id === NULL_OPTION_PLACEHOLDER ? null : data.tipo_servicio_id,
        // precio_manual_servicio will be taken directly from form state, which is updated by useEffect
        precio_manual_servicio: data.precio_manual_servicio, 
        notas_cliente: data.notas_cliente || null,
      };
      
      const result = await createEnvioIndividualAction(
        payload,
        initialData.latitud_retiro,
        initialData.longitud_retiro,
        initialData.latitud_entrega,
        initialData.longitud_entrega
      );

      if (result.success) {
        toast({
          title: "Solicitud Enviada",
          description: result.info || "Su solicitud de envío ha sido registrada. Nos pondremos en contacto pronto.",
          duration: 7000,
        });
        onSuccess(); 
      } else {
        toast({
          title: "Error al Enviar Solicitud",
          description: result.error || "No se pudo procesar su solicitud. Por favor, intente nuevamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Inesperado",
        description: (error as Error).message || "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
      console.error("Error submitting new shipment request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader>
         <CardTitle className="text-xl">Paso 2: Completar Detalles del Envío</CardTitle>
         <CardDescription>
          Las direcciones y el precio base cotizado se han pre-cargado. Complete la información restante.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
            
            <section className="space-y-4 p-4 border rounded-md shadow-sm bg-muted/30">
              <h3 className="text-lg font-semibold flex items-center gap-2"><InfoIcon className="h-5 w-5 text-primary" />Resumen de Cotización</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Retiro:</span> {initialData.direccion_retiro}</div>
                <div><span className="font-medium">Entrega:</span> {initialData.direccion_entrega}</div>
                <div><span className="font-medium">Precio Cotizado Base:</span> <span className="font-bold text-lg">{initialData.precio_cotizado !== null ? `$${initialData.precio_cotizado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</span></div>
              </div>
            </section>

            <section className="space-y-4 p-4 border rounded-md shadow-sm">
              <h3 className="text-lg font-semibold flex items-center gap-2"><User className="h-5 w-5 text-primary" />Datos del Solicitante/Contacto</h3>
              <FormField control={form.control} name="nombre_cliente" render={({ field }) => (<FormItem><FormLabel>Su Nombre Completo <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="Ej: Juan Pérez" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="email_cliente" render={({ field }) => (<FormItem><FormLabel>Su Email (Opcional)</FormLabel><FormControl><Input type="email" placeholder="Ej: juan.perez@correo.com" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="telefono_cliente" render={({ field }) => (<FormItem><FormLabel>Su Teléfono (Opcional)</FormLabel><FormControl><Input type="tel" placeholder="Ej: 2235123456" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </section>
            
            {/* Hidden fields for pre-filled addresses and coordinates */}
            <input type="hidden" {...form.register("direccion_retiro")} />
            <input type="hidden" {...form.register("latitud_retiro")} />
            <input type="hidden" {...form.register("longitud_retiro")} />
            <input type="hidden" {...form.register("direccion_entrega")} />
            <input type="hidden" {...form.register("latitud_entrega")} />
            <input type="hidden" {...form.register("longitud_entrega")} />

            <section className="space-y-4 p-4 border rounded-md shadow-sm">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Detalles del Paquete</h3>
              <FormField control={form.control} name="tipo_paquete_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Paquete <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === NULL_OPTION_PLACEHOLDER ? null : value)} value={field.value || NULL_OPTION_PLACEHOLDER}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value={NULL_OPTION_PLACEHOLDER} disabled>-- Seleccione un Tipo --</SelectItem>
                        {tiposPaquete.map((tipo) => (<SelectItem key={tipo.id} value={tipo.id}>{tipo.nombre}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="descripcion_paquete" render={({ field }) => (<FormItem><FormLabel>Descripción del Paquete (Opcional)</FormLabel><FormControl><Textarea placeholder="Ej: Documentos importantes, Ropa, etc." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="peso_paquete" render={({ field }) => (<FormItem><FormLabel>Peso (kg) (Opcional)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ej: 1.5" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="dimensiones_paquete" render={({ field }) => (<FormItem><FormLabel>Dimensiones (LxAxH cm) (Opcional)</FormLabel><FormControl><Input placeholder="Ej: 30x20x10" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </section>
            
            <section className="space-y-4 p-4 border rounded-md shadow-sm">
                <h3 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Tipo de Servicio y Valor Final</h3>
                 <FormField control={form.control} name="tipo_servicio_id" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Servicio</FormLabel>
                        <Select 
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value ? field.value : (showManualPriceInput ? MANUAL_PRICE_PLACEHOLDER : NULL_OPTION_PLACEHOLDER)}
                        >
                            <FormControl><SelectTrigger><SelectValue placeholder="Usar precio cotizado o especificar..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value={NULL_OPTION_PLACEHOLDER}>Usar Precio Cotizado ({initialData.precio_cotizado !== null ? `$${initialData.precio_cotizado.toLocaleString('es-AR')}` : 'N/A'})</SelectItem>
                                <SelectItem value={MANUAL_PRICE_PLACEHOLDER}>-- Ingresar Precio Manual Diferente --</SelectItem>
                                {tiposServicio.map(servicio => (
                                    <SelectItem key={servicio.id} value={servicio.id}>
                                        {servicio.nombre} {servicio.precio_base !== null ? `($${servicio.precio_base.toLocaleString('es-AR')})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>Si no selecciona uno, se usará el precio cotizado. Si elige un servicio, se usará su precio base.</FormDescription>
                        <FormMessage />
                    </FormItem>
                 )} />
                 <FormField control={form.control} name="precio_manual_servicio" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Precio Final del Servicio (ARS) <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                            <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="Ej: 1250.50" 
                                {...field}
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                                disabled={!showManualPriceInput && form.getValues('tipo_servicio_id') !== NULL_OPTION_PLACEHOLDER && form.getValues('tipo_servicio_id') !== null}
                            />
                        </FormControl>
                        <FormDescription>
                            {showManualPriceInput ? "Ingrese el precio final deseado." : 
                             (form.getValues('tipo_servicio_id') && form.getValues('tipo_servicio_id') !== NULL_OPTION_PLACEHOLDER ? 
                                "Precio basado en el tipo de servicio seleccionado." : 
                                "Se utilizará el precio cotizado inicialmente.")
                            }
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                 )} />
            </section>

            <FormField control={form.control} name="notas_cliente" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary"/>Notas Adicionales para el Envío (Opcional)</FormLabel><FormControl><Textarea placeholder="Ej: Frágil, entregar en recepción, llamar antes, etc." className="resize-y min-h-[100px]" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            
            <div className="flex flex-col sm:flex-row gap-4">
                 <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto flex items-center gap-2">
                    <Edit className="h-4 w-4"/> Modificar Direcciones
                </Button>
                <Button type="submit" className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white py-3 text-base" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Solicitando Envío...</> : <><Send className="mr-2 h-4 w-4" /> Confirmar Solicitud de Envío</>}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
