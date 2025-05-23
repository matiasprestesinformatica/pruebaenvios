
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import type { ShipmentFormData } from "@/lib/schemas";
import { shipmentSchema, estadoEnvioEnum } from "@/lib/schemas";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Lightbulb, Send, Info, DollarSign, Box as BoxIcon } from "lucide-react";
import type { Cliente, TipoPaquete, TipoServicio } from "@/types/supabase";
import type { SuggestDeliveryOptionsOutput } from "@/ai/flows/suggest-delivery-options";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const NULL_VALUE_PLACEHOLDER = "_NULL_VALUE_";
const MANUAL_SERVICE_ID_PLACEHOLDER = "_MANUAL_";

interface ShipmentFormProps {
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'email' | 'direccion' | 'latitud' | 'longitud'>[];
  tiposPaquete: Pick<TipoPaquete, 'id' | 'nombre'>[];
  tiposServicio: Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[];
  onSuggestOptions?: (data: Pick<ShipmentFormData, 'client_location' | 'package_weight' | 'tipo_paquete_id'>) => Promise<SuggestDeliveryOptionsOutput | null>;
  onSubmitShipment: (data: ShipmentFormData, aiSuggestions?: SuggestDeliveryOptionsOutput) => Promise<{success: boolean, error?: string | null, info?: string | null, data?: any}>;
  initialData?: Partial<ShipmentFormData>;
  isEditMode?: boolean;
  onOpenChange?: (open: boolean) => void; // Declared as it's passed by EditShipmentDialog
}

export function ShipmentForm({ 
    clientes, 
    tiposPaquete,
    tiposServicio,
    onSuggestOptions, 
    onSubmitShipment, 
    initialData,
    isEditMode = false,
    onOpenChange // Deconstructed
}: ShipmentFormProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestDeliveryOptionsOutput | null>(null);
  const [selectedClientAddress, setSelectedClientAddress] = useState<string | null>(null);
  const [showManualPriceState, setShowManualPriceState] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: { // Default values for new form
      cliente_id: null,
      nombre_cliente_temporal: "",
      client_location: "",
      tipo_paquete_id: null,
      package_weight: 0.1,
      status: estadoEnvioEnum.Values.pending,
      tipo_servicio_id: null,
      precio_servicio_final: null,
    },
  });

  const selectedClientId = form.watch("cliente_id");
  // Watched value for tipo_servicio_id to react to its changes
  const watchedTipoServicioId = form.watch("tipo_servicio_id");

  useEffect(() => {
    if (isEditMode && initialData) {
      const defaultFormValues: Partial<ShipmentFormData> = {
        cliente_id: initialData.cliente_id || null,
        nombre_cliente_temporal: initialData.nombre_cliente_temporal || "",
        client_location: initialData.client_location || "",
        tipo_paquete_id: initialData.tipo_paquete_id || null,
        package_weight: initialData.package_weight === undefined ? 0.1 : initialData.package_weight,
        status: initialData.status || estadoEnvioEnum.Values.pending,
        tipo_servicio_id: initialData.tipo_servicio_id || null,
        precio_servicio_final: initialData.precio_servicio_final === undefined ? null : initialData.precio_servicio_final,
      };
      form.reset(defaultFormValues);
      
      const clientForInitialData = initialData.cliente_id ? clientes.find(c => c.id === initialData.cliente_id) : null;
      setSelectedClientAddress(clientForInitialData?.direccion || initialData.client_location || null);
      
      const initialIsManualPrice = (initialData.tipo_servicio_id === null || initialData.tipo_servicio_id === MANUAL_SERVICE_ID_PLACEHOLDER) &&
                                 initialData.precio_servicio_final !== null &&
                                 initialData.precio_servicio_final !== undefined;
      setShowManualPriceState(initialIsManualPrice);

    } else if (!isEditMode) {
      form.reset({ // Reset to new form defaults
        cliente_id: null,
        nombre_cliente_temporal: "",
        client_location: "",
        tipo_paquete_id: null,
        package_weight: 0.1,
        status: estadoEnvioEnum.Values.pending,
        tipo_servicio_id: null,
        precio_servicio_final: null,
      });
      setSelectedClientAddress(null);
      setShowManualPriceState(false);
    }
  }, [isEditMode, initialData, form, clientes]); // form removed from deps as per react-hook-form guidance on reset

  useEffect(() => {
    if (selectedClientId && selectedClientId !== NULL_VALUE_PLACEHOLDER) {
      const client = clientes.find(c => c.id === selectedClientId);
      if (client) {
        form.setValue("nombre_cliente_temporal", ""); // Clear temporary name
        if (client.direccion) {
          form.setValue("client_location", client.direccion, { shouldValidate: true });
          setSelectedClientAddress(client.direccion);
        } else {
           // Client selected but has no address - keep current form value if editing, clear if creating
           if (!isEditMode || (initialData?.cliente_id !== selectedClientId)) {
            form.setValue("client_location", "", { shouldValidate: true });
            setSelectedClientAddress(null);
          }
          toast({title: "Advertencia", description: "El cliente seleccionado no tiene una dirección registrada. Ingrese la dirección manualmente o actualice los datos del cliente.", variant: "destructive", duration: 7000});
        }
      }
    } else if (selectedClientId === NULL_VALUE_PLACEHOLDER) {
      // If "Ninguno / Envío Temporal" is selected, clear client-specific fields
      // but allow manual entry for client_location and nombre_cliente_temporal.
      // The form fields themselves handle this.
      // We might want to clear form.setValue("client_location", "") here if it wasn't an edit
      if (!isEditMode || (initialData && initialData.cliente_id !== null)) { // If switching from a client to temporal
        form.setValue("client_location", "", { shouldValidate: true });
      }
      setSelectedClientAddress(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, clientes, form.setValue, toast, isEditMode, initialData?.cliente_id]);

  const handleTipoServicioChange = (value: string | null) => {
    form.setValue('tipo_servicio_id', value === NULL_VALUE_PLACEHOLDER || value === MANUAL_SERVICE_ID_PLACEHOLDER ? null : value);
    if (value === MANUAL_SERVICE_ID_PLACEHOLDER) {
      setShowManualPriceState(true);
      // Keep existing manual price if user toggles back and forth, or let them clear it
    } else if (value && value !== NULL_VALUE_PLACEHOLDER) {
      const servicio = tiposServicio.find(s => s.id === value);
      form.setValue("precio_servicio_final", servicio?.precio_base ?? null);
      setShowManualPriceState(false);
    } else { // NULL_VALUE_PLACEHOLDER or empty
      form.setValue("precio_servicio_final", null);
      setShowManualPriceState(false);
    }
  };


  const handleSuggestOptionsLocal = async () => {
    if (!onSuggestOptions) return;
    const formDataForSuggestion = form.getValues();
    const isValid = await form.trigger(["client_location", "package_weight", "tipo_paquete_id"]);
    if (!isValid) {
        toast({ title: "Error de Validación", description: "Corrija los campos resaltados para obtener sugerencias.", variant: "destructive"});
        return;
    }
    setIsSuggesting(true);
    setAiSuggestions(null);
    try {
      const suggestions = await onSuggestOptions({
          client_location: formDataForSuggestion.client_location!, // Assert non-null as it's validated
          package_weight: formDataForSuggestion.package_weight,
          tipo_paquete_id: formDataForSuggestion.tipo_paquete_id
      });
      if (suggestions) {
        setAiSuggestions(suggestions);
        toast({ title: "Sugerencias Recibidas"});
      } else {
        toast({ title: "Error de Sugerencia", description: "La IA no pudo generar sugerencias esta vez.", variant: "destructive"});
      }
    } catch (error) {
      toast({ title: "Error Inesperado en Sugerencias", description: (error as Error).message, variant: "destructive"});
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleFormSubmit = async (data: ShipmentFormData) => {
    setIsSubmitting(true);
    const submissionData: ShipmentFormData = {
        ...data,
        cliente_id: data.cliente_id === NULL_VALUE_PLACEHOLDER ? null : data.cliente_id,
        tipo_paquete_id: data.tipo_paquete_id === NULL_VALUE_PLACEHOLDER ? null : data.tipo_paquete_id,
        tipo_servicio_id: data.tipo_servicio_id === NULL_VALUE_PLACEHOLDER || data.tipo_servicio_id === MANUAL_SERVICE_ID_PLACEHOLDER ? null : data.tipo_servicio_id,
        precio_servicio_final: data.precio_servicio_final === undefined ? null : data.precio_servicio_final,
        status: data.status || estadoEnvioEnum.Values.pending, // Ensure status has a default if not provided
    };

    try {
        const result = await onSubmitShipment(submissionData, aiSuggestions ?? undefined);
        if (result.success) {
            toast({ title: isEditMode ? "Envío Actualizado" : "Envío Creado", description: `${isEditMode ? "Los cambios han sido guardados." : "El nuevo envío ha sido registrado."} ${result.info || ''}` });
            if (!isEditMode) {
                router.push("/envios");
                form.reset({
                  cliente_id: null, nombre_cliente_temporal: "", client_location: "",
                  tipo_paquete_id: null, package_weight: 0.1, status: estadoEnvioEnum.Values.pending,
                  tipo_servicio_id: null, precio_servicio_final: null,
                });
                setAiSuggestions(null); setSelectedClientAddress(null); setShowManualPriceState(false);
            } else {
               if(onOpenChange) onOpenChange(false); // Close dialog if in edit mode from a dialog
               router.refresh(); 
            }
        } else {
            toast({ title: isEditMode ? "Error al Actualizar" : "Error al Crear Envío", description: result.error || "Error desconocido.", variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error Inesperado", description: (error as Error).message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente y Envío</CardTitle>
            <CardDescription>Complete los detalles del envío.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente Existente (Opcional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === NULL_VALUE_PLACEHOLDER ? null : value)}
                    value={field.value || NULL_VALUE_PLACEHOLDER}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar un cliente" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NULL_VALUE_PLACEHOLDER}>Ninguno / Envío Temporal</SelectItem>
                      {clientes.map((cliente) => (<SelectItem key={cliente.id} value={cliente.id}>{cliente.nombre} {cliente.apellido} ({cliente.email || 'Sin email'})</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             {(!selectedClientId || selectedClientId === NULL_VALUE_PLACEHOLDER) && (
                <FormField control={form.control} name="nombre_cliente_temporal" render={({ field }) => (<FormItem><FormLabel>Nombre Cliente (Temporal)</FormLabel><FormControl><Input placeholder="Nombre del destinatario" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
            )}
            {selectedClientId && selectedClientId !== NULL_VALUE_PLACEHOLDER && selectedClientAddress ? (
                <FormItem><FormLabel>Ubicación del Cliente (Automático)</FormLabel><div className="flex items-center gap-2 p-3 border rounded-md bg-muted/20 text-sm"><Info className="h-4 w-4 text-muted-foreground flex-shrink-0" /><span>{selectedClientAddress}</span></div><Input type="hidden" {...form.register("client_location")} value={selectedClientAddress || ""} /></FormItem>
            ) : (
                <FormField control={form.control} name="client_location" render={({ field }) => (<FormItem><FormLabel>Ubicación Manual</FormLabel><FormControl><Input placeholder="Dirección completa (Ej: Av. Colón 1234, Mar del Plata)" {...field} value={field.value || ""}/></FormControl><FormMessage /></FormItem>)} />
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tipo_paquete_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Paquete</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === NULL_VALUE_PLACEHOLDER ? null : value)} value={field.value || NULL_VALUE_PLACEHOLDER}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo de paquete" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value={NULL_VALUE_PLACEHOLDER}>Seleccionar un tipo</SelectItem>
                        {tiposPaquete.map((tipo) => (<SelectItem key={tipo.id} value={tipo.id}>{tipo.nombre}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="package_weight" render={({ field }) => (<FormItem><FormLabel>Peso (kg)</FormLabel><FormControl><Input type="number" step="0.01" min="0.01" placeholder="Ej: 1.5" {...field} onChange={event => field.onChange(parseFloat(event.target.value))} value={field.value ?? 0.1} /></FormControl><FormMessage /></FormItem>)} />
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Servicio y Precio</CardTitle>
                <CardDescription>Seleccione un tipo de servicio o ingrese un precio manual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="tipo_servicio_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Servicio</FormLabel>
                             <Select 
                                onValueChange={(value) => handleTipoServicioChange(value)} 
                                value={field.value ? field.value : (showManualPriceState ? MANUAL_SERVICE_ID_PLACEHOLDER : NULL_VALUE_PLACEHOLDER)}
                            >
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar un tipo de servicio" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value={NULL_VALUE_PLACEHOLDER}>Ninguno</SelectItem>
                                    <SelectItem value={MANUAL_SERVICE_ID_PLACEHOLDER}>-- Ingreso Manual de Precio --</SelectItem>
                                    {tiposServicio.map(servicio => (
                                        <SelectItem key={servicio.id} value={servicio.id}>
                                            {servicio.nombre} {servicio.precio_base !== null && servicio.precio_base !== undefined ? `($${servicio.precio_base.toFixed(2)})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="precio_servicio_final"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Precio Final del Servicio</FormLabel>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    placeholder="Ej: 1200.50" 
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                                    disabled={!showManualPriceState}
                                />
                            </FormControl>
                            <FormDescription>
                                {showManualPriceState ? "Ingrese el precio manualmente." : (watchedTipoServicioId && watchedTipoServicioId !== NULL_VALUE_PLACEHOLDER && watchedTipoServicioId !== MANUAL_SERVICE_ID_PLACEHOLDER ? "Precio basado en el tipo de servicio seleccionado." : "Seleccione un tipo de servicio o ingrese un precio manual.")}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>

        {isEditMode && (
          <Card>
            <CardHeader><CardTitle>Estado del Envío</CardTitle></CardHeader>
            <CardContent>
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Estado Actual</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger></FormControl><SelectContent>{estadoEnvioEnum.options.map((estado) => (<SelectItem key={estado} value={estado}>{estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>
        )}

        {!isEditMode && onSuggestOptions && (
          <Button type="button" variant="outline" onClick={handleSuggestOptionsLocal} disabled={isSuggesting || isSubmitting} className="w-full sm:w-auto">
            {isSuggesting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Obteniendo Sugerencias...</> : <><Lightbulb className="mr-2 h-4 w-4" />Sugerir Opciones (IA)</>}
          </Button>
        )}

        {aiSuggestions && !isEditMode && (
          <Card className="bg-secondary/50"><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-accent" />Sugerencias (IA)</CardTitle></CardHeader><CardContent className="space-y-4"><Alert><AlertTitle>Opciones Sugeridas:</AlertTitle><AlertDescription><ul className="list-disc pl-5 space-y-1">{aiSuggestions.suggestedOptions.map((opt, idx) => (<li key={idx}>{opt}</li>))}</ul></AlertDescription></Alert><Alert><AlertTitle>Razonamiento:</AlertTitle><AlertDescription>{aiSuggestions.reasoning}</AlertDescription></Alert></CardContent></Card>
        )}

        <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || isSuggesting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? "Guardando Cambios..." : "Crear Envío..."}</> : <><Send className="mr-2 h-4 w-4" />{isEditMode ? "Guardar Cambios" : "Crear Envío"}</>}
        </Button>
      </form>
    </Form>
  );
}

    