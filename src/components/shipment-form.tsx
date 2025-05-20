
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ShipmentFormData } from "@/lib/schemas";
import { shipmentSchema } from "@/lib/schemas";
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
  clientes: Cliente[]; // Asegúrate de que el tipo Cliente incluye 'direccion'
  onSuggestOptions: (data: ShipmentFormData) => Promise<SuggestDeliveryOptionsOutput | null>;
  onSubmitShipment: (data: ShipmentFormData, aiSuggestions?: SuggestDeliveryOptionsOutput) => Promise<{success: boolean, error?: string | null}>;
}

export function ShipmentForm({ clientes, onSuggestOptions, onSubmitShipment }: ShipmentFormProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestDeliveryOptionsOutput | null>(null);
  const [selectedClientAddress, setSelectedClientAddress] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      cliente_id: undefined,
      nombre_cliente_temporal: "",
      client_location: "",
      package_size: undefined,
      package_weight: 0.1,
    },
  });

  const selectedClientId = form.watch("cliente_id");

  useEffect(() => {
    if (selectedClientId) {
      const client = clientes.find(c => c.id === selectedClientId);
      if (client && client.direccion) {
        form.setValue("client_location", client.direccion, { shouldValidate: true });
        form.setValue("nombre_cliente_temporal", "", { shouldValidate: true });
        setSelectedClientAddress(client.direccion);
      } else {
        // Cliente seleccionado pero no encontrado o sin dirección
        form.setValue("client_location", "", { shouldValidate: true }); // Limpiar para que la validación falle si es necesario
        setSelectedClientAddress(null);
        if(client && !client.direccion) {
            toast({title: "Advertencia", description: "El cliente seleccionado no tiene una dirección registrada. Por favor, actualice los datos del cliente o ingrese la dirección manualmente.", variant: "destructive", duration: 7000});
        }
      }
    } else {
      // No hay cliente seleccionado, permitir entrada manual
      // No limpiamos client_location aquí para permitir que el usuario lo ingrese
      // form.setValue("client_location", "", { shouldValidate: true }); // Esto borraría la entrada manual al deseleccionar
      setSelectedClientAddress(null);
    }
  }, [selectedClientId, clientes, form, toast]);


  const handleSuggestOptions = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
        toast({ title: "Error de Validación", description: "Por favor corrija los errores en el formulario.", variant: "destructive"});
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
            toast({ title: "Envío Creado", description: "El envío ha sido registrado exitosamente." });
            router.push("/envios"); 
            form.reset();
            setAiSuggestions(null);
            setSelectedClientAddress(null);
        } else {
            toast({ title: "Error al Crear Envío", description: result.error || "No se pudo registrar el envío.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error submitting shipment:", error);
        toast({ title: "Error Inesperado", description: "Ocurrió un error al registrar el envío.", variant: "destructive" });
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
                      field.onChange(value === "" ? null : value); // Manejar deselección
                    }} 
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar un cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Ninguno / Envío Temporal</SelectItem>
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
             {!selectedClientId && (
                <FormField
                control={form.control}
                name="nombre_cliente_temporal"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre Cliente (para nuevo envío)</FormLabel>
                    <FormControl>
                        <Input placeholder="Nombre del destinatario si no es cliente existente" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

            {selectedClientId && selectedClientAddress ? (
                <FormItem>
                    <FormLabel>Ubicación del Cliente (Automático)</FormLabel>
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/20 text-sm">
                      <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{selectedClientAddress}</span>
                    </div>
                    {/* Campo oculto para mantener client_location en los datos del formulario */}
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
                    <FormLabel>Ubicación del Cliente/Destino</FormLabel>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      onChange={event => field.onChange(+event.target.value)} // coerce to number
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="button" variant="outline" onClick={handleSuggestOptions} disabled={isSuggesting || isSubmitting} className="w-full sm:w-auto">
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

        {aiSuggestions && (
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
              Creando Envío...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Crear Envío
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
