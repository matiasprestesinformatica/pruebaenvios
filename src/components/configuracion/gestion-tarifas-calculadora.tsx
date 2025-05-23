
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormField, FormItem, FormMessage, FormControl } from "@/components/ui/form";
import { tipoCalculadoraServicioEnum, listaTarifasCalculadoraSchema, type TarifaDistanciaCalculadoraFormData } from '@/lib/schemas';
import type { ListaTarifasCalculadoraFormData } from '@/lib/schemas';
import type { TipoCalculadoraServicioEnum, TarifaDistanciaCalculadora } from '@/types/supabase';
import { getTarifasCalculadoraConHistorialAction, saveListaTarifasCalculadoraAction, deleteTarifasCalculadoraPorFechaAction } from '@/app/configuracion/actions';
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, PlusCircle, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


type TarifasAgrupadas = Record<string, TarifaDistanciaCalculadora[]>;

export function GestionTarifasCalculadora() {
  const [tipoCalculadoraSeleccionado, setTipoCalculadoraSeleccionado] = useState<TipoCalculadoraServicioEnum>('lowcost');
  const [tarifasAgrupadas, setTarifasAgrupadas] = useState<TarifasAgrupadas>({});
  const [fechasVigencia, setFechasVigencia] = useState<string[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<ListaTarifasCalculadoraFormData>({
    resolver: zodResolver(listaTarifasCalculadoraSchema),
    defaultValues: {
      fecha_vigencia_desde: new Date(),
      tarifas: [{ distancia_hasta_km: 0, precio: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tarifas",
  });

  const fetchTarifas = useCallback(async (tipo: TipoCalculadoraServicioEnum) => {
    setIsLoading(true);
    setFechaSeleccionada(''); // Reset selected date when type changes
    const result = await getTarifasCalculadoraConHistorialAction(tipo);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      setTarifasAgrupadas({});
      setFechasVigencia([]);
    } else {
      setTarifasAgrupadas(result.data);
      const sortedFechas = Object.keys(result.data).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      setFechasVigencia(sortedFechas);
      if (sortedFechas.length > 0) {
        setFechaSeleccionada(sortedFechas[0]);
      }
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchTarifas(tipoCalculadoraSeleccionado);
  }, [tipoCalculadoraSeleccionado, fetchTarifas]);
  
  const handleSaveNuevaLista = async (data: ListaTarifasCalculadoraFormData) => {
    setIsSubmitting(true);
    
    for (let i = 0; i < data.tarifas.length; i++) {
        if (data.tarifas[i].distancia_hasta_km <= 0) {
            toast({ title: "Error de Validación", description: `La 'Distancia Hasta (km)' del tramo ${i+1} debe ser un valor positivo.`, variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        if (data.tarifas[i].precio < 0) {
             toast({ title: "Error de Validación", description: `El 'Precio' del tramo ${i+1} no puede ser negativo.`, variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        if (i > 0 && data.tarifas[i].distancia_hasta_km <= data.tarifas[i-1].distancia_hasta_km) {
            toast({ title: "Error de Validación", description: `La 'Distancia Hasta (km)' del tramo ${i+1} debe ser mayor que la del tramo anterior.`, variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
    }
    
    const result = await saveListaTarifasCalculadoraAction(
      tipoCalculadoraSeleccionado, 
      data.fecha_vigencia_desde, // Pass the Date object
      data.tarifas
    );

    if (result.success) {
      toast({ title: "Éxito", description: "Lista de tarifas guardada correctamente." });
      setIsDialogOpen(false);
      form.reset({ fecha_vigencia_desde: new Date(), tarifas: [{ distancia_hasta_km: 0, precio: 0 }] });
      fetchTarifas(tipoCalculadoraSeleccionado); // Refetch to show the new list
    } else {
      toast({ title: "Error al Guardar", description: result.error || "No se pudo guardar la lista de tarifas.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDeleteListaActual = async () => {
    if (!fechaSeleccionada) return;
    setIsSubmitting(true);
    const result = await deleteTarifasCalculadoraPorFechaAction(tipoCalculadoraSeleccionado, fechaSeleccionada);
    if (result.success) {
      toast({ title: "Éxito", description: `Lista de tarifas para ${format(parseISO(fechaSeleccionada), "dd/MM/yyyy", { locale: es })} eliminada.` });
      fetchTarifas(tipoCalculadoraSeleccionado);
    } else {
      toast({ title: "Error al Eliminar", description: result.error || "No se pudo eliminar la lista de tarifas.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const tarifasMostradas = fechaSeleccionada ? tarifasAgrupadas[fechaSeleccionada] || [] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Tarifas para Calculadoras</CardTitle>
        <CardDescription>Define y administra los precios por distancia para los servicios Express y LowCost.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="tipo-calculadora-selector">Tipo de Servicio</Label>
            <Select value={tipoCalculadoraSeleccionado} onValueChange={(value) => setTipoCalculadoraSeleccionado(value as TipoCalculadoraServicioEnum)}>
              <SelectTrigger id="tipo-calculadora-selector"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={tipoCalculadoraServicioEnum.Values.lowcost}>LowCost</SelectItem>
                <SelectItem value={tipoCalculadoraServicioEnum.Values.express}>Express</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><PlusCircle className="mr-2 h-4 w-4" /> Crear Nueva Lista de Tarifas</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Crear/Editar Lista de Tarifas para {tipoCalculadoraSeleccionado === 'lowcost' ? 'LowCost' : 'Express'}</DialogTitle>
                <DialogDescription>Define los tramos de distancia y precios para una fecha de vigencia específica.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveNuevaLista)} className="space-y-4 py-2">
                  <FormField
                    control={form.control}
                    name="fecha_vigencia_desde"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <Label>Fecha de Vigencia Desde</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value && isValidDate(field.value) ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) }/>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label>Tramos de Tarifa</Label>
                    {fields.map((fieldItem, index) => (
                      <div key={fieldItem.id} className="flex items-center gap-2 p-2 border rounded-md">
                        <FormField
                          control={form.control}
                          name={`tarifas.${index}.distancia_hasta_km`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <Label htmlFor={`dist-${index}`} className="sr-only">Distancia Hasta (km)</Label>
                              <FormControl>
                                <Input id={`dist-${index}`} type="number" placeholder="Hasta (km)" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                              </FormControl>
                              <FormMessage/>
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`tarifas.${index}.precio`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                               <Label htmlFor={`price-${index}`} className="sr-only">Precio</Label>
                               <FormControl>
                                <Input id={`price-${index}`} type="number" step="0.01" placeholder="Precio ($)" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                               </FormControl>
                               <FormMessage/>
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => fields.length > 1 && remove(index)} disabled={fields.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ distancia_hasta_km: 0, precio: 0 })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir Tramo
                    </Button>
                  </div>
                  <DialogFooter className="pt-4">
                    <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar Lista
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}

        {!isLoading && fechasVigencia.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                    <Label htmlFor="fecha-vigencia-selector">Seleccionar Lista de Precios por Fecha de Vigencia</Label>
                    <Select value={fechaSeleccionada} onValueChange={setFechaSeleccionada}>
                        <SelectTrigger id="fecha-vigencia-selector"><SelectValue /></SelectTrigger>
                        <SelectContent>
                        {fechasVigencia.map(fecha => (
                            <SelectItem key={fecha} value={fecha}>
                            {format(parseISO(fecha), "dd MMM yyyy", { locale: es })} {fecha === fechasVigencia[0] ? '(Más Reciente)' : ''}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={!fechaSeleccionada || isSubmitting}>
                            <Trash2 className="mr-2 h-4 w-4"/> Eliminar Lista Seleccionada
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente la lista de precios para el tipo '{tipoCalculadoraSeleccionado === 'lowcost' ? 'LowCost' : 'Express'}' 
                            con fecha de vigencia {fechaSeleccionada ? format(parseISO(fechaSeleccionada), "dd/MM/yyyy", { locale: es }) : ''}. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteListaActual} className="bg-destructive hover:bg-destructive/90">
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sí, eliminar
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            
            {tarifasMostradas.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Distancia Hasta (km)</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tarifasMostradas.map((tarifa) => (
                      <TableRow key={tarifa.id || `${tarifa.distancia_hasta_km}-${tarifa.precio}`}>
                        <TableCell>{tarifa.distancia_hasta_km} km</TableCell>
                        <TableCell className="text-right">${tarifa.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No hay tramos de tarifa para la fecha y tipo seleccionados.</p>
            )}
          </div>
        )}
         {!isLoading && fechasVigencia.length === 0 && (
            <div className="text-center py-8 space-y-2">
                <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">No hay listas de precios configuradas para el servicio de <span className="font-semibold">{tipoCalculadoraSeleccionado === 'lowcost' ? 'LowCost' : 'Express'}</span>.</p>
                <p className="text-sm text-muted-foreground">Puede crear una nueva lista usando el botón de arriba.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
