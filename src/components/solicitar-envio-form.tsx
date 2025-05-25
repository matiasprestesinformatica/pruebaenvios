
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Loader2, Send, User, Mail, Phone, MapPin, Package, Edit, CircleDollarSign, MenuSquare, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { TipoPaquete, TipoServicio } from "@/types/supabase";

const NULL_OPTION_PLACEHOLDER = "_NULL_OPTION_";
const MANUAL_PRICE_PLACEHOLDER = "_MANUAL_PRICE_";

interface SolicitarEnvioFormProps {
  tiposPaquete: Pick<TipoPaquete, 'id' | 'nombre'>[];
  tiposServicio: Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[];
  createEnvioIndividualAction: (
    data: SolicitudEnvioIndividualFormData
  ) => Promise<{ success: boolean; error?: string | null; info?: string | null }>;
}

export function SolicitarEnvioForm({
  tiposPaquete,
  tiposServicio,
  createEnvioIndividualAction,
}: SolicitarEnvioFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualPriceInput, setShowManualPriceInput] = useState(false);
  const { toast } = useToast();

  const form = useForm<SolicitudEnvioIndividualFormData>({
    resolver: zodResolver(solicitudEnvioIndividualSchema),
    defaultValues: {
      nombre_cliente: "",
      email_cliente: "",
      telefono_cliente: "",
      direccion_retiro: "",
      latitud_retiro: null,
      longitud_retiro: null,
      direccion_entrega: "",
      latitud_entrega: null,
      longitud_entrega: null,
      tipo_paquete_id: null,
      descripcion_paquete: "",
      peso_paquete: null,
      dimensiones_paquete: "",
      tipo_servicio_id: null,
      precio_manual_servicio: null,
      notas_cliente: "",
    },
  });

  const watchedTipoServicioId = form.watch("tipo_servicio_id");

  useEffect(() => {
    if (watchedTipoServicioId === MANUAL_PRICE_PLACEHOLDER) {
      setShowManualPriceInput(true);
      form.setValue("tipo_servicio_id", null); // Clear actual service ID if manual price is chosen
    } else if (watchedTipoServicioId && watchedTipoServicioId !== NULL_OPTION_PLACEHOLDER) {
      const selectedService = tiposServicio.find(s => s.id === watchedTipoServicioId);
      if (selectedService && selectedService.precio_base !== null) {
        form.setValue("precio_manual_servicio", selectedService.precio_base);
      } else {
         // If service has no base price, allow manual input or keep it null
         // form.setValue("precio_manual_servicio", null); // Optional: clear if service has no price
      }
      setShowManualPriceInput(false); // Hide manual input if a service with potential base price is selected
    } else { // NULL_OPTION_PLACEHOLDER or cleared
      setShowManualPriceInput(false);
      form.setValue("precio_manual_servicio", null);
    }
  }, [watchedTipoServicioId, tiposServicio, form]);

  const handleFormSubmit = async (data: SolicitudEnvioIndividualFormData) => {
    setIsSubmitting(true);
    try {
      // Ensure nulls are passed correctly for optional fields not filled
      const payload: SolicitudEnvioIndividualFormData = {
        ...data,
        email_cliente: data.email_cliente || null,
        telefono_cliente: data.telefono_cliente || null,
        latitud_retiro: data.latitud_retiro || null,
        longitud_retiro: data.longitud_retiro || null,
        latitud_entrega: data.latitud_entrega || null,
        longitud_entrega: data.longitud_entrega || null,
        descripcion_paquete: data.descripcion_paquete || null,
        peso_paquete: data.peso_paquete || null,
        dimensiones_paquete: data.dimensiones_paquete || null,
        tipo_servicio_id: data.tipo_servicio_id === MANUAL_PRICE_PLACEHOLDER || data.tipo_servicio_id === NULL_OPTION_PLACEHOLDER ? null : data.tipo_servicio_id,
        precio_manual_servicio: showManualPriceInput ? (data.precio_manual_servicio || null) : (watchedTipoServicioId && watchedTipoServicioId !== NULL_OPTION_PLACEHOLDER && watchedTipoServicioId !== MANUAL_PRICE_PLACEHOLDER ? tiposServicio.find(s=>s.id === watchedTipoServicioId)?.precio_base ?? null : null),
        notas_cliente: data.notas_cliente || null,
      };
      
      const result = await createEnvioIndividualAction(payload);
      if (result.success) {
        toast({
          title: "Solicitud Enviada",
          description: result.info || "Su solicitud de envío ha sido registrada. Nos pondremos en contacto pronto.",
          duration: 7000,
        });
        form.reset();
        setShowManualPriceInput(false);
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
        description: "Ocurrió un error al procesar la solicitud.",
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
        <CardTitle className="text-xl">Complete los Datos de su Envío</CardTitle>
        <CardDescription>
          Proporcione la información detallada para que podamos procesar su solicitud de envío de manera eficiente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
            
            <section className="space-y-4 p-4 border rounded-md shadow-sm">
              <h3 className="text-lg font-semibold flex items-center gap-2"><User className="h-5 w-5 text-primary" />Datos del Solicitante</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="nombre_cliente" render={({ field }) => (<FormItem><FormLabel>Su Nombre Completo <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="Ej: Juan Pérez" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email_cliente" render={({ field }) => (<FormItem><FormLabel>Su Email (Opcional)</FormLabel><FormControl><Input type="email" placeholder="Ej: juan.perez@correo.com" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="telefono_cliente" render={({ field }) => (<FormItem><FormLabel>Su Teléfono (Opcional)</FormLabel><FormControl><Input type="tel" placeholder="Ej: 2235123456" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            </section>

            <section className="space-y-4 p-4 border rounded-md shadow-sm">
              <h3 className="text-lg font-semibold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Datos de Retiro (Origen)</h3>
              <FormField control={form.control} name="direccion_retiro" render={({ field }) => (<FormItem><FormLabel>Dirección de Retiro <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="Ej: Av. Colón 1234, Mar del Plata" {...field} /></FormControl><FormDescription>Se intentará geocodificar. Ingrese lat/lng manual si es necesario.</FormDescription><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="latitud_retiro" render={({ field }) => (<FormItem><FormLabel>Latitud Retiro (Manual)</FormLabel><FormControl><Input type="number" step="any" placeholder="Ej: -38.005" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="longitud_retiro" render={({ field }) => (<FormItem><FormLabel>Longitud Retiro (Manual)</FormLabel><FormControl><Input type="number" step="any" placeholder="Ej: -57.542" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </section>

            <section className="space-y-4 p-4 border rounded-md shadow-sm">
              <h3 className="text-lg font-semibold flex items-center gap-2"><MapPin className="h-5 w-5 text-accent" />Datos de Entrega (Destino)</h3>
              <FormField control={form.control} name="direccion_entrega" render={({ field }) => (<FormItem><FormLabel>Dirección de Entrega <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="Ej: Av. Luro 3200, Mar del Plata" {...field} /></FormControl><FormDescription>Se intentará geocodificar. Ingrese lat/lng manual si es necesario.</FormDescription><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="latitud_entrega" render={({ field }) => (<FormItem><FormLabel>Latitud Entrega (Manual)</FormLabel><FormControl><Input type="number" step="any" placeholder="Ej: -38.002" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="longitud_entrega" render={({ field }) => (<FormItem><FormLabel>Longitud Entrega (Manual)</FormLabel><FormControl><Input type="number" step="any" placeholder="Ej: -57.551" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </section>

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
                <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" />Tipo de Servicio y Valor</h3>
                 <FormField control={form.control} name="tipo_servicio_id" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Servicio (Opcional)</FormLabel>
                        <Select 
                            onValueChange={(value) => {
                                field.onChange(value === NULL_OPTION_PLACEHOLDER || value === MANUAL_PRICE_PLACEHOLDER ? null : value);
                                if (value === MANUAL_PRICE_PLACEHOLDER) {
                                    setShowManualPriceInput(true);
                                    // form.setValue("precio_manual_servicio", null); // Keep existing if user toggles
                                } else if (value && value !== NULL_OPTION_PLACEHOLDER) {
                                    const servicio = tiposServicio.find(s => s.id === value);
                                    form.setValue("precio_manual_servicio", servicio?.precio_base ?? null);
                                    setShowManualPriceInput(false);
                                } else {
                                    setShowManualPriceInput(false);
                                    form.setValue("precio_manual_servicio", null);
                                }
                            }} 
                            value={field.value ? field.value : (showManualPriceInput ? MANUAL_PRICE_PLACEHOLDER : NULL_OPTION_PLACEHOLDER)}
                        >
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar o ingresar precio manual..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value={NULL_OPTION_PLACEHOLDER}>Ninguno (se cotizará aparte)</SelectItem>
                                <SelectItem value={MANUAL_PRICE_PLACEHOLDER}>-- Ingresar Precio Manual --</SelectItem>
                                {tiposServicio.map(servicio => (
                                    <SelectItem key={servicio.id} value={servicio.id}>
                                        {servicio.nombre} {servicio.precio_base !== null ? `($${servicio.precio_base.toFixed(2)})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                 )} />
                 <FormField control={form.control} name="precio_manual_servicio" render={({ field }) => (
                    <FormItem style={{ display: showManualPriceInput || (form.getValues("tipo_servicio_id") === null && form.getValues("precio_manual_servicio") !== null) ? 'block' : 'none' }}>
                        <FormLabel>Precio Manual del Servicio (ARS) (Opcional)</FormLabel>
                        <FormControl>
                            <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="Ej: 1250.50" 
                                {...field}
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                            />
                        </FormControl>
                        <FormDescription>Si no selecciona un tipo de servicio, o si el tipo no tiene precio base, puede ingresar un precio aquí.</FormDescription>
                        <FormMessage />
                    </FormItem>
                 )} />
            </section>

            <FormField control={form.control} name="notas_cliente" render={({ field }) => (<FormItem><FormLabel>Notas Adicionales para el Envío (Opcional)</FormLabel><FormControl><Textarea placeholder="Ej: Frágil, entregar en recepción, llamar antes, etc." className="resize-y min-h-[100px]" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Solicitando Envío...</> : <><Send className="mr-2 h-4 w-4" /> Solicitar Envío</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
