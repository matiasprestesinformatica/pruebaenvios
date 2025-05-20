
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { RepartoLoteCreationFormData } from "@/lib/schemas";
import { repartoLoteCreationSchema, estadoEnvioEnum } from "@/lib/schemas"; // tipoRepartoEnum removed as it's not directly used here but in actions
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
import { Badge } from "@/components/ui/badge";

import { Loader2, CalendarIcon } from "lucide-react"; // Search, User, Package, MapPin, Info removed as not used
import type { Repartidor, Empresa, Cliente, Reparto, EnvioConCliente } from "@/types/supabase";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

interface RepartoLoteCreateFormProps {
  repartidores: Pick<Repartidor, 'id' | 'nombre'>[];
  empresas: Pick<Empresa, 'id' | 'nombre'>[];
  getClientesByEmpresaAction: (empresaId: string) => Promise<Cliente[]>;
  getEnviosByClientesAction: (clienteIds: string[]) => Promise<EnvioConCliente[]>;
  createRepartoLoteAction: (data: RepartoLoteCreationFormData) => Promise<{ success: boolean; error?: string | null; data?: Reparto | null }>;
}

function getEstadoEnvioBadgeColor(estado: string | null): string {
    if (!estado) return 'bg-gray-400 text-white';
    switch (estado) {
      case estadoEnvioEnum.Values.pending: return 'bg-yellow-500 text-black';
      case estadoEnvioEnum.Values.suggested: return 'bg-purple-500 text-white';
      case estadoEnvioEnum.Values.asignado_a_reparto: return 'bg-blue-500 text-white';
      case estadoEnvioEnum.Values.en_transito: return 'bg-orange-500 text-white';
      case estadoEnvioEnum.Values.entregado: return 'bg-green-500 text-white';
      case estadoEnvioEnum.Values.cancelado: return 'bg-red-500 text-white';
      case estadoEnvioEnum.Values.problema_entrega: return 'bg-pink-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
}

export function RepartoLoteCreateForm({
  repartidores,
  empresas,
  getClientesByEmpresaAction,
  getEnviosByClientesAction,
  createRepartoLoteAction,
}: RepartoLoteCreateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [clientesDeEmpresa, setClientesDeEmpresa] = useState<Cliente[]>([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState(false);
  const [searchTermClientes, setSearchTermClientes] = useState("");
  
  const [enviosDeClientesSeleccionados, setEnviosDeClientesSeleccionados] = useState<EnvioConCliente[]>([]);
  const [isLoadingEnviosClientes, setIsLoadingEnviosClientes] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<RepartoLoteCreationFormData>({
    resolver: zodResolver(repartoLoteCreationSchema),
    defaultValues: {
      fecha_reparto: new Date(),
      repartidor_id: undefined,
      empresa_id: undefined,
      cliente_ids: [],
      envio_ids: [],
    },
  });

  const selectedEmpresaId = form.watch("empresa_id");
  const selectedClienteIds = form.watch("cliente_ids");

  const fetchClientes = useCallback(async (empresaId: string | undefined) => {
    if (!empresaId) {
      setClientesDeEmpresa([]);
      setEnviosDeClientesSeleccionados([]);
      form.setValue("cliente_ids", []);
      form.setValue("envio_ids", []);
      return;
    }
    setIsLoadingClientes(true);
    const clientes = await getClientesByEmpresaAction(empresaId);
    setClientesDeEmpresa(clientes);
    setIsLoadingClientes(false);
    // Reset selections when company changes
    setEnviosDeClientesSeleccionados([]);
    form.setValue("cliente_ids", []);
    form.setValue("envio_ids", []);
  }, [getClientesByEmpresaAction, form]);

  useEffect(() => {
    fetchClientes(selectedEmpresaId);
  }, [selectedEmpresaId, fetchClientes]);

  const fetchEnvios = useCallback(async (clienteIds: string[]) => {
    if (!clienteIds || clienteIds.length === 0) {
      setEnviosDeClientesSeleccionados([]);
      form.setValue("envio_ids", []);
      return;
    }
    setIsLoadingEnviosClientes(true);
    const envios = await getEnviosByClientesAction(clienteIds);
    setEnviosDeClientesSeleccionados(envios);
    setIsLoadingEnviosClientes(false);
    form.setValue("envio_ids", []); // Reset selected envios when client selection changes
  }, [getEnviosByClientesAction, form]);

  useEffect(() => {
    fetchEnvios(selectedClienteIds);
  }, [selectedClienteIds, fetchEnvios]);

  const handleFormSubmit = async (data: RepartoLoteCreationFormData) => {
    setIsSubmitting(true);
    const result = await createRepartoLoteAction(data);
    if (result.success) {
      toast({ title: "Reparto por Lote Creado", description: "El nuevo reparto por lote ha sido guardado exitosamente." });
      router.push("/repartos");
      form.reset();
      setClientesDeEmpresa([]);
      setEnviosDeClientesSeleccionados([]);
      setSearchTermClientes("");
    } else {
      toast({ title: "Error", description: result.error || "No se pudo crear el reparto por lote.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const filteredClientes = clientesDeEmpresa.filter(cliente => 
    `${cliente.nombre} ${cliente.apellido} ${cliente.email || ''} ${cliente.direccion || ''}`.toLowerCase().includes(searchTermClientes.toLowerCase())
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Reparto por Lote</CardTitle>
            <CardDescription>Configure la fecha, repartidor y empresa para el lote.</CardDescription>
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
              <CardTitle>Selección de Clientes de la Empresa</CardTitle>
              <CardDescription>Seleccione los clientes a incluir en este reparto por lote.</CardDescription>
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
                  name="cliente_ids"
                  render={() => (
                    <FormItem>
                      <ScrollArea className="h-72 w-full rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]"></TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead className="hidden sm:table-cell">Dirección</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredClientes.map((cliente) => (
                              <TableRow key={cliente.id}>
                                <TableCell>
                                  <FormField
                                    key={cliente.id}
                                    control={form.control}
                                    name="cliente_ids"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(cliente.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), cliente.id])
                                                : field.onChange(
                                                    (field.value || []).filter((id) => id !== cliente.id)
                                                  );
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>{cliente.nombre} {cliente.apellido}</TableCell>
                                <TableCell>{cliente.email}</TableCell>
                                <TableCell className="hidden sm:table-cell">{cliente.direccion}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
        )}

        {selectedClienteIds && selectedClienteIds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ajustar Envíos para Clientes Seleccionados</CardTitle>
              <CardDescription>Seleccione los envíos existentes de los clientes seleccionados para incluir en este reparto.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEnviosClientes && <p className="py-4 text-muted-foreground">Cargando envíos de clientes...</p>}
              {!isLoadingEnviosClientes && enviosDeClientesSeleccionados.length === 0 && (
                <p className="py-4 text-muted-foreground text-center">No hay envíos existentes para los clientes seleccionados.</p>
              )}
              {!isLoadingEnviosClientes && enviosDeClientesSeleccionados.length > 0 && (
                <FormField
                  control={form.control}
                  name="envio_ids"
                  render={() => (
                    <FormItem>
                      <ScrollArea className="h-72 w-full rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]"></TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Ubicación</TableHead>
                              <TableHead>Paquete</TableHead>
                              <TableHead>Estado Actual</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enviosDeClientesSeleccionados.map((envio) => (
                              <TableRow key={envio.id}>
                                <TableCell>
                                  <FormField
                                    key={envio.id}
                                    control={form.control}
                                    name="envio_ids"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(envio.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), envio.id])
                                                : field.onChange(
                                                    (field.value || []).filter((id) => id !== envio.id)
                                                  );
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>{envio.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}` : envio.nombre_cliente_temporal || 'N/A'}</TableCell>
                                <TableCell>{envio.client_location}</TableCell>
                                <TableCell>{envio.package_size}, {envio.package_weight}kg</TableCell>
                                <TableCell>
                                    <Badge className={`${getEstadoEnvioBadgeColor(envio.status)} capitalize`}>
                                        {envio.status ? envio.status.replace(/_/g, ' ') : 'Desconocido'}
                                    </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || isLoadingClientes || isLoadingEnviosClientes}>
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
