
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ShipmentFormData } from "@/lib/schemas";
import { shipmentSchema, estadoEnvioEnum } from "@/lib/schemas"; // Import estadoEnvioEnum
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Lightbulb, Send, Info } from "lucide-react";
import type { Cliente } from "@/types/supabase";
import type { SuggestDeliveryOptionsOutput } from "@/ai/flows/suggest-delivery-options";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface ShipmentFormProps {
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'email' | 'direccion'>[];
  onSuggestOptions?: (data: ShipmentFormData) => Promise<SuggestDeliveryOptionsOutput | null>; // Make optional if not used in edit
  onSubmitShipment: (data: ShipmentFormData, aiSuggestions?: SuggestDeliveryOptionsOutput) => Promise<{success: boolean, error?: string | null, info?: string | null}>; // Added info
  initialData?: Partial<ShipmentFormData>; // For editing
  isEditMode?: boolean; // To control form behavior
}

const NULL_VALUE_PLACEHOLDER = "_NULL_VALUE_";

export function ShipmentForm({ 
    clientes, 
    onSuggestOptions, 
    onSubmitShipment, 
    initialData,
    isEditMode = false 
}: ShipmentFormProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestDeliveryOptionsOutput | null>(null);
  const [selectedClientAddress, setSelectedClientAddress] = useState<string | null>(initialData?.client_location || null);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: initialData || {
      cliente_id: null,
      nombre_cliente_temporal: "",
      client_location: "",
      package_size: undefined,
      package_weight: 0.1,
      status: estadoEnvioEnum.Values.pending, // Default for creation
    },
  });

  const selectedClientId = form.watch("cliente_id");

  useEffect(() => {
    // If in edit mode and initialData is provided, pre-fill address
    if (isEditMode && initialData?.client_location) {
      setSelectedClientAddress(initialData.client_location);
      if (initialData.cliente_id) {
        const client = clientes.find(c => c.id === initialData.cliente_id);
        if (client && client.direccion) {
            setSelectedClientAddress(client.direccion);
            form.setValue("client_location", client.direccion, { shouldValidate: true });
        }
      }
    }
  }, [isEditMode, initialData, clientes, form]);


  useEffect(() => {
    if (selectedClientId && selectedClientId !== NULL_VALUE_PLACEHOLDER) {
      const client = clientes.find(c => c.id === selectedClientId);
      if (client && client.direccion) {
        form.setValue("client_location", client.direccion, { shouldValidate: true });
        form.setValue("nombre_cliente_temporal", "", { shouldValidate: true });
        setSelectedClientAddress(client.direccion);
      } else {
        form.setValue("client_location", "", { shouldValidate: true });
        setSelectedClientAddress(null);
        if(client && !client.direccion && !isEditMode) { // Only show toast on new form if client has no address
            toast({title: "Advertencia", description: "El cliente seleccionado no tiene una dirección registrada. Por favor, actualice los datos del cliente o ingrese la dirección manualmente.", variant: "destructive", duration: 7000});
        }
      }
    } else {
      if (selectedClientId === NULL_VALUE_PLACEHOLDER && !isEditMode) { // Clear only if creating new and "Ninguno" is selected
        form.setValue("client_location", "", { shouldValidate: true });
      }
      // Don't clear client_location if it was pre-filled from initialData in edit mode
      if(!isEditMode || (isEditMode && selectedClientId === NULL_VALUE_PLACEHOLDER)){
         setSelectedClientAddress(null);
      }
    }
  }, [selectedClientId, clientes, form, toast, isEditMode]);


  const handleSuggestOptionsLocal = async () => {
    if (!onSuggestOptions) return;
    const isValid = await form.trigger(["client_location", "package_size", "package_weight"]);
    if (!isValid) {
        toast({ title: "Error de Validación", description: "Por favor corrija los errores en ubicación, tamaño o peso para obtener sugerencias.", variant: "destructive"});
        return;
    }

    setIsSuggesting(true);
    setAiSuggestions(null);
    const formData = form.getValues();
    try {
      const suggestions = await onSuggestOptions(formData);
      if (suggestions) {
        setAiSuggestions(suggestions);
        toast({ title: "Sugerencias Recibidas", description: "Se han cargado las opciones de entrega sugeridas por IA."});
      } else {
        toast({ title: "Error de Sugerencia", description: "No se pudieron obtener sugerencias de la IA.", variant: "destructive"});
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      toast({ title: "Error Inesperado", description: "Ocurrió un error al obtener sugerencias.", variant: "destructive"});
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleFormSubmit = async (data: ShipmentFormData) => {
    setIsSubmitting(true);
    try {
        const result = await onSubmitShipment(data, aiSuggestions ?? undefined);
        if (result.success) {
            toast({ title: isEditMode ? "Envío Actualizado" : "Envío Creado", description: `${isEditMode ? 'El envío ha sido actualizado' : 'El envío ha sido registrado'} exitosamente. ${result.info || ""}` });
            if (!isEditMode) {
                router.push("/envios");
                form.reset({
                cliente_id: null,
                nombre_cliente_temporal: "",
                client_location: "",
                package_size: undefined,
                package_weight: 0.1,
                status: estadoEnvioEnum.Values.pending,
                });
                setAiSuggestions(null);
                setSelectedClientAddress(null);
            }
        } else {
            toast({ title: isEditMode ? "Error al Actualizar" : "Error al Crear Envío", description: result.error || `No se pudo ${isEditMode ? 'actualizar' : 'registrar'} el envío.`, variant: "destructive" });
        }
    } catch (error) {
        console.error(`Error ${isEditMode ? 'updating' : 'submitting'} shipment:`, error);
        toast({ title: "Error Inesperado", description: `Ocurrió un error al ${isEditMode ? 'actualizar' : 'registrar'} el envío.`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente y Paquete</CardTitle>
            <CardDescription>Seleccione un cliente o ingrese los detalles del envío.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente Existente (Opcional)</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value === NULL_VALUE_PLACEHOLDER ? null : value);
                    }}
                    value={field.value === null || field.value === undefined ? NULL_VALUE_PLACEHOLDER : field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar un cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NULL_VALUE_PLACEHOLDER}>Ninguno / Envío Temporal</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre} {cliente.apellido} ({cliente.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             {(!selectedClientId || selectedClientId === NULL_VALUE_PLACEHOLDER) && (
                <FormField
                control={form.control}
                name="nombre_cliente_temporal"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre Cliente (para envío temporal)</FormLabel>
                    <FormControl>
                        <Input placeholder="Nombre del destinatario si no es cliente existente" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

            {selectedClientId && selectedClientId !== NULL_VALUE_PLACEHOLDER && selectedClientAddress ? (
                <FormItem>
                    <FormLabel>Ubicación del Cliente (Automático)</FormLabel>
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/20 text-sm">
                      <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{selectedClientAddress}</span>
                    </div>
                    <FormField
                        control={form.control}
                        name="client_location"
                        render={({ field }) => <Input type="hidden" {...field} />}
                    />
                </FormItem>
            ) : (
                <FormField
                control={form.control}
                name="client_location"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Ubicación del Cliente/Destino Manual</FormLabel>
                    <FormControl>
                        <Input placeholder="Ciudad, Provincia o Dirección completa" {...field} value={field.value || ""}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}


            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="package_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamaño del Paquete</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tamaño" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="small">Pequeño</SelectItem>
                        <SelectItem value="medium">Mediano</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="package_weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso del Paquete (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" min="0.1" placeholder="Ej: 1.5" {...field}
                      onChange={event => field.onChange(parseFloat(event.target.value))} // Ensure it's a number
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEditMode && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado del Envío</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {estadoEnvioEnum.options.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            {estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {!isEditMode && onSuggestOptions && (
          <Button type="button" variant="outline" onClick={handleSuggestOptionsLocal} disabled={isSuggesting || isSubmitting} className="w-full sm:w-auto">
            {isSuggesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Obteniendo Sugerencias...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                Sugerir Opciones de Entrega (IA)
              </>
            )}
          </Button>
        )}

        {aiSuggestions && !isEditMode && (
          <Card className="bg-secondary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-accent" />
                Sugerencias de Entrega (IA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTitle>Opciones Sugeridas:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 space-y-1">
                    {aiSuggestions.suggestedOptions.map((opt, idx) => (
                      <li key={idx}>{opt}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
              <Alert>
                <AlertTitle>Razonamiento:</AlertTitle>
                <AlertDescription>{aiSuggestions.reasoning}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || isSuggesting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditMode ? "Guardando Cambios..." : "Creando Envío..."}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {isEditMode ? "Guardar Cambios" : "Crear Envío"}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
