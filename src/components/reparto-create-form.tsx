
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { RepartoCreationFormData } from "@/lib/schemas";
import { repartoCreationSchema, tipoRepartoEnum } from "@/lib/schemas";
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

import { Loader2, CalendarIcon, Search } from "lucide-react";
import type { Repartidor, Empresa, Envio, Cliente, Reparto } from "@/types/supabase";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

interface RepartoCreateFormProps {
  repartidores: Pick<Repartidor, 'id' | 'nombre'>[];
  empresas: Pick<Empresa, 'id' | 'nombre'>[];
  initialEnviosPendientes: (Envio & { clientes: Pick<Cliente, 'nombre' | 'apellido'> | null })[];
  getEnviosPendientesAction: (searchTerm?: string) => Promise<(Envio & { clientes: Pick<Cliente, 'nombre' | 'apellido'> | null })[]>;
  getEnviosPendientesPorEmpresaAction: (empresaId: string) => Promise<(Envio & { clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido'> | null })[]>;
  createRepartoAction: (data: RepartoCreationFormData) => Promise<{ success: boolean; error?: string | null; data?: Reparto | null }>;
}

type EnvioConCliente = Envio & { clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'direccion' | 'email'> | null };


export function RepartoCreateForm({
  repartidores,
  empresas,
  initialEnviosPendientes,
  getEnviosPendientesAction,
  getEnviosPendientesPorEmpresaAction,
  createRepartoAction,
}: RepartoCreateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>(tipoRepartoEnum.Values.individual);
  
  const [enviosParaSeleccion, setEnviosParaSeleccion] = useState<EnvioConCliente[]>(initialEnviosPendientes);
  const [isLoadingEnvios, setIsLoadingEnvios] = useState(false);
  const [searchTermIndividual, setSearchTermIndividual] = useState("");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | undefined>(undefined);

  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<RepartoCreationFormData>({
    resolver: zodResolver(repartoCreationSchema),
    defaultValues: {
      fecha_reparto: new Date(),
      repartidor_id: undefined,
      tipo_reparto: tipoRepartoEnum.Values.individual,
      empresa_id: undefined,
      envio_ids: [],
    },
  });

  const fetchEnviosIndividuales = useCallback(async (term: string) => {
    setIsLoadingEnvios(true);
    const envios = await getEnviosPendientesAction(term);
    setEnviosParaSeleccion(envios);
    setIsLoadingEnvios(false);
  }, [getEnviosPendientesAction]);

  const fetchEnviosPorEmpresa = useCallback(async (empresaId: string) => {
    if (!empresaId) {
      setEnviosParaSeleccion([]);
      return;
    }
    setIsLoadingEnvios(true);
    const envios = await getEnviosPendientesPorEmpresaAction(empresaId);
    setEnviosParaSeleccion(envios);
    setIsLoadingEnvios(false);
  }, [getEnviosPendientesPorEmpresaAction]);

  useEffect(() => {
    if (currentTab === tipoRepartoEnum.Values.individual) {
      fetchEnviosIndividuales(searchTermIndividual);
    } else if (currentTab === tipoRepartoEnum.Values.viaje_empresa && selectedEmpresaId) {
      fetchEnviosPorEmpresa(selectedEmpresaId);
    } else {
      setEnviosParaSeleccion([]);
    }
  }, [currentTab, searchTermIndividual, selectedEmpresaId, fetchEnviosIndividuales, fetchEnviosPorEmpresa]);

  const handleFormSubmit = async (data: RepartoCreationFormData) => {
    setIsSubmitting(true);
    const result = await createRepartoAction(data);
    if (result.success) {
      toast({ title: "Reparto Creado", description: "El nuevo reparto ha sido guardado exitosamente." });
      router.push("/repartos");
      form.reset();
      setEnviosParaSeleccion(initialEnviosPendientes); // Reset envios list
      setSearchTermIndividual("");
      setSelectedEmpresaId(undefined);
    } else {
      toast({ title: "Error", description: result.error || "No se pudo crear el reparto.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const tipoRepartoActual = form.watch("tipo_reparto");

  useEffect(() => {
    form.setValue("envio_ids", []); // Reset selected envios when tab changes
    if (tipoRepartoActual === tipoRepartoEnum.Values.individual) {
        form.setValue("empresa_id", undefined); // Clear empresa_id if not viaje_empresa
    }
  }, [tipoRepartoActual, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Reparto</CardTitle>
            <CardDescription>Configure la fecha, repartidor y tipo de reparto.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                          disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} // Disable past dates
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
            </div>
             <FormField
                control={form.control}
                name="tipo_reparto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Reparto</FormLabel>
                     <Select onValueChange={(value) => {
                        field.onChange(value);
                        setCurrentTab(value);
                     }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo de reparto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={tipoRepartoEnum.Values.individual}>Envíos Individuales</SelectItem>
                        <SelectItem value={tipoRepartoEnum.Values.viaje_empresa}>Viaje por Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Selección de Envíos</CardTitle>
            </CardHeader>
            <CardContent>
                {tipoRepartoActual === tipoRepartoEnum.Values.individual && (
                     <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Input 
                                type="text"
                                placeholder="Buscar envíos por ubicación, cliente..."
                                value={searchTermIndividual}
                                onChange={(e) => setSearchTermIndividual(e.target.value)}
                                className="max-w-sm"
                            />
                            <Button type="button" variant="outline" onClick={() => fetchEnviosIndividuales(searchTermIndividual)} disabled={isLoadingEnvios}>
                                {isLoadingEnvios ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}
                                Buscar
                            </Button>
                        </div>
                     </div>
                )}

                {tipoRepartoActual === tipoRepartoEnum.Values.viaje_empresa && (
                     <FormField
                        control={form.control}
                        name="empresa_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Empresa</FormLabel>
                            <Select 
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedEmpresaId(value);
                                }} 
                                defaultValue={field.value || undefined}
                            >
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
                )}

                {isLoadingEnvios && <p className="py-4 text-muted-foreground">Cargando envíos...</p>}
                {!isLoadingEnvios && enviosParaSeleccion.length === 0 && (
                    <p className="py-4 text-muted-foreground text-center">
                        {tipoRepartoActual === tipoRepartoEnum.Values.viaje_empresa && !selectedEmpresaId 
                            ? "Seleccione una empresa para ver sus envíos pendientes." 
                            : "No hay envíos pendientes que coincidan."}
                    </p>
                )}

                {!isLoadingEnvios && enviosParaSeleccion.length > 0 && (
                    <FormField
                        control={form.control}
                        name="envio_ids"
                        render={() => (
                        <FormItem className="mt-4">
                             <div className="mb-2">
                                <FormLabel className="text-base">Envíos Disponibles</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                    Seleccione los envíos para incluir en este reparto.
                                </p>
                            </div>
                            <ScrollArea className="h-72 w-full rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Cliente/Destino</TableHead>
                                        <TableHead>Ubicación</TableHead>
                                        <TableHead className="hidden sm:table-cell">Paquete</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {enviosParaSeleccion.map((envio) => (
                                    <TableRow key={envio.id}>
                                    <TableCell>
                                        <FormField
                                            key={envio.id}
                                            control={form.control}
                                            name="envio_ids"
                                            render={({ field }) => {
                                                return (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(envio.id)}
                                                        onCheckedChange={(checked) => {
                                                        return checked
                                                            ? field.onChange([...(field.value || []), envio.id])
                                                            : field.onChange(
                                                                (field.value || []).filter(
                                                                (value) => value !== envio.id
                                                                )
                                                            )
                                                        }}
                                                    />
                                                    </FormControl>
                                                </FormItem>
                                                )
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {envio.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}` : envio.nombre_cliente_temporal || 'N/A'}
                                    </TableCell>
                                    <TableCell>{envio.client_location}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{envio.package_size}, {envio.package_weight}kg</TableCell>
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

        <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || isLoadingEnvios}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando Reparto...
            </>
          ) : (
            "Guardar Reparto"
          )}
        </Button>
      </form>
    </Form>
  );
}
