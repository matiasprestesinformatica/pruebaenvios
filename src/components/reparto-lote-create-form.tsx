
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import type { RepartoLoteCreationFormData, ClienteConServicioLoteData } from "@/lib/schemas";
import { repartoLoteCreationSchema } from "@/lib/schemas"; 
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Loader2, CalendarIcon, Trash2 } from "lucide-react"; 
import type { Repartidor, Empresa, Cliente, Reparto, TipoServicio } from "@/types/supabase";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from 'date-fns/locale';


interface RepartoLoteCreateFormProps {
  repartidores: Pick<Repartidor, 'id' | 'nombre'>[];
  empresas: Pick<Empresa, 'id' | 'nombre'>[];
  tiposServicio: Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[];
  getClientesByEmpresaAction: (empresaId: string) => Promise<Cliente[]>;
  createRepartoLoteAction: (data: RepartoLoteCreationFormData) => Promise<{ success: boolean; error?: string | null; data?: Reparto | null }>;
}

const MANUAL_SERVICE_ID_PLACEHOLDER = "_MANUAL_";

export function RepartoLoteCreateForm({
  repartidores,
  empresas,
  tiposServicio,
  getClientesByEmpresaAction,
  createRepartoLoteAction,
}: RepartoLoteCreateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientesDeEmpresa, setClientesDeEmpresa] = useState<Cliente[]>([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState(false);
  const [searchTermClientes, setSearchTermClientes] = useState("");
  const [showManualPrice, setShowManualPrice] = useState<Record<string, boolean>>({});
  
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<RepartoLoteCreationFormData>({
    resolver: zodResolver(repartoLoteCreationSchema),
    defaultValues: {
      fecha_reparto: new Date(),
      repartidor_id: undefined,
      empresa_id: undefined,
      clientes_con_servicio: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "clientes_con_servicio",
    keyName: "fieldId" 
  });

  const selectedEmpresaId = form.watch("empresa_id");

  const fetchClientes = useCallback(async (empresaId: string | undefined) => {
    form.setValue("clientes_con_servicio", []); // Clear existing selections
    setShowManualPrice({});
    if (!empresaId) {
      setClientesDeEmpresa([]);
      return;
    }
    setIsLoadingClientes(true);
    const clientes = await getClientesByEmpresaAction(empresaId);
    setClientesDeEmpresa(clientes);
    setIsLoadingClientes(false);
  }, [getClientesByEmpresaAction, form]);

  useEffect(() => {
    fetchClientes(selectedEmpresaId);
  }, [selectedEmpresaId, fetchClientes]);


  const handleFormSubmit = async (data: RepartoLoteCreationFormData) => {
    setIsSubmitting(true);
    const result = await createRepartoLoteAction(data);
    if (result.success) {
      toast({ title: "Reparto por Lote Creado", description: "El nuevo reparto por lote y los envíos asociados han sido generados exitosamente." });
      router.push("/repartos"); 
      form.reset({ fecha_reparto: new Date(), repartidor_id: undefined, empresa_id: undefined, clientes_con_servicio: [] });
      setClientesDeEmpresa([]);
      setSearchTermClientes("");
      setShowManualPrice({});
    } else {
      toast({ title: "Error", description: result.error || "No se pudo crear el reparto por lote.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const filteredClientes = clientesDeEmpresa.filter(cliente => 
    `${cliente.nombre} ${cliente.apellido} ${cliente.email || ''} ${cliente.direccion || ''}`.toLowerCase().includes(searchTermClientes.toLowerCase())
  );

  const handleClienteSelectionChange = (clienteId: string, checked: boolean) => {
    const existingIndex = fields.findIndex(field => field.cliente_id === clienteId);
    if (checked && existingIndex === -1) {
      append({ cliente_id: clienteId, tipo_servicio_id_lote: null, precio_manual_lote: null });
    } else if (!checked && existingIndex !== -1) {
      remove(existingIndex);
      setShowManualPrice(prev => ({...prev, [clienteId]: false}));
    }
  };

  const handleTipoServicioChange = (clienteId: string, index: number, tipoServicioId: string | null) => {
    let precioManual = form.getValues(`clientes_con_servicio.${index}.precio_manual_lote`);
    
    if (tipoServicioId && tipoServicioId !== MANUAL_SERVICE_ID_PLACEHOLDER) {
      const servicioSeleccionado = tiposServicio.find(ts => ts.id === tipoServicioId);
      precioManual = servicioSeleccionado?.precio_base ?? null;
      setShowManualPrice(prev => ({...prev, [clienteId]: false}));
    } else if (tipoServicioId === MANUAL_SERVICE_ID_PLACEHOLDER) {
      precioManual = null; // Clear manual price if switching to manual, let user enter
      setShowManualPrice(prev => ({...prev, [clienteId]: true}));
    } else { // "Ninguno" selected
      precioManual = null;
      setShowManualPrice(prev => ({...prev, [clienteId]: false}));
    }
    
    update(index, {
      cliente_id: clienteId,
      tipo_servicio_id_lote: tipoServicioId === MANUAL_SERVICE_ID_PLACEHOLDER ? null : tipoServicioId,
      precio_manual_lote: precioManual
    });
  };
  

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Reparto por Lote</CardTitle>
            <CardDescription>Configure la fecha, repartidor y empresa. Se generarán envíos para los clientes seleccionados, asignando un valor de servicio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="fecha_reparto"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Reparto</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value && "text-muted-foreground"
                            }`}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="repartidor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repartidor Asignado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar un repartidor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {repartidores.map((repartidor) => (
                          <SelectItem key={repartidor.id} value={repartidor.id}>
                            {repartidor.nombre}
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
                name="empresa_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar una empresa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {empresas.map((empresa) => (
                          <SelectItem key={empresa.id} value={empresa.id}>
                            {empresa.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {selectedEmpresaId && (
          <Card>
            <CardHeader>
              <CardTitle>Selección de Clientes y Configuración de Servicio</CardTitle>
              <CardDescription>Seleccione los clientes y configure el valor del servicio para cada uno.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input 
                  type="text"
                  placeholder="Buscar clientes..."
                  value={searchTermClientes}
                  onChange={(e) => setSearchTermClientes(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              {isLoadingClientes && <p className="py-4 text-muted-foreground">Cargando clientes...</p>}
              {!isLoadingClientes && filteredClientes.length === 0 && (
                <p className="py-4 text-muted-foreground text-center">
                  {clientesDeEmpresa.length > 0 ? "Ningún cliente coincide con la búsqueda." : "No hay clientes para esta empresa."}
                </p>
              )}
              {!isLoadingClientes && filteredClientes.length > 0 && (
                <FormField
                  control={form.control}
                  name="clientes_con_servicio"
                  render={() => ( // field prop is not directly used here as we manage array fields
                    <FormItem>
                      <ScrollArea className="h-96 w-full rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]"></TableHead>
                              <TableHead>Nombre Cliente</TableHead>
                              <TableHead className="w-[250px]">Tipo de Servicio</TableHead>
                              <TableHead className="w-[150px]">Precio Manual</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredClientes.map((cliente) => {
                              const fieldIndex = fields.findIndex(f => f.cliente_id === cliente.id);
                              const isSelected = fieldIndex !== -1;
                              const currentFieldData = isSelected ? fields[fieldIndex] : null;
                              
                              return (
                                <TableRow key={cliente.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => handleClienteSelectionChange(cliente.id, !!checked)}
                                    />
                                  </TableCell>
                                  <TableCell>{cliente.nombre} {cliente.apellido}</TableCell>
                                  <TableCell>
                                    {isSelected && currentFieldData && (
                                      <Controller
                                        control={form.control}
                                        name={`clientes_con_servicio.${fieldIndex}.tipo_servicio_id_lote` as const}
                                        render={({ field: selectField }) => (
                                          <Select
                                            onValueChange={(value) => handleTipoServicioChange(cliente.id, fieldIndex, value === "" ? null : value)}
                                            value={selectField.value ?? ""}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Seleccionar servicio" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="">Ninguno</SelectItem>
                                              <SelectItem value={MANUAL_SERVICE_ID_PLACEHOLDER}>-- Ingreso Manual --</SelectItem>
                                              {tiposServicio.map(ts => (
                                                <SelectItem key={ts.id} value={ts.id}>
                                                  {ts.nombre} ({ts.precio_base !== null ? `$${ts.precio_base.toFixed(2)}` : 'Sin precio base'})
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        )}
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {isSelected && currentFieldData && (
                                      <Controller
                                        control={form.control}
                                        name={`clientes_con_servicio.${fieldIndex}.precio_manual_lote` as const}
                                        render={({ field: inputField }) => (
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Precio manual"
                                            {...inputField}
                                            value={inputField.value ?? ""}
                                            onChange={(e) => inputField.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                                            disabled={!showManualPrice[cliente.id] && (currentFieldData.tipo_servicio_id_lote !== null && currentFieldData.tipo_servicio_id_lote !== MANUAL_SERVICE_ID_PLACEHOLDER)}
                                          />
                                        )}
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                      <FormMessage>
                        {form.formState.errors.clientes_con_servicio?.message || 
                         form.formState.errors.clientes_con_servicio?.root?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || isLoadingClientes}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando Reparto por Lote...
            </>
          ) : (
            "Guardar Reparto por Lote"
          )}
        </Button>
      </form>
    </Form>
  );
}
