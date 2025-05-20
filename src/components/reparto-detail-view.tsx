
"use client";

import type { RepartoCompleto, ParadaConEnvioYCliente, TipoParadaEnum } from "@/types/supabase";
import type { EstadoReparto } from "@/lib/schemas";
import { estadoRepartoEnum, estadoEnvioEnum, tipoParadaEnum as tipoParadaSchemaEnum } from "@/lib/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useEffect, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { User, CalendarDays, Truck, Building, Loader2, MapPin as IconMapPin, ArrowUp, ArrowDown, Home } from "lucide-react";

interface RepartoDetailViewProps {
  initialReparto: RepartoCompleto;
  updateRepartoStatusAction: (repartoId: string, nuevoEstado: EstadoReparto, envioIds: string[]) => Promise<{ success: boolean; error?: string | null }>;
  reorderParadasAction: (repartoId: string, paradaId: string, direccion: 'up' | 'down') => Promise<{ success: boolean; error?: string | null }>;
}

function ClientSideFormattedDate({ dateString, formatString = "PPP" }: { dateString: string | null, formatString?: string }) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!dateString) {
      setFormattedDate('-');
      return;
    }
    try {
      const dateObject = parseISO(dateString);
      setFormattedDate(format(dateObject, formatString, { locale: es }));
    } catch (e) {
      console.error("Error parsing date string:", dateString, e);
      setFormattedDate("Fecha inválida");
    }
  }, [dateString, formatString]);

  return <>{formattedDate || "Cargando..."}</>;
}

function getEstadoRepartoBadgeVariant(estado?: string | null) {
  if (!estado) return 'outline';
  switch (estado) {
    case estadoRepartoEnum.Values.asignado: return 'default';
    case estadoRepartoEnum.Values.en_curso: return 'secondary';
    case estadoRepartoEnum.Values.completado: return 'outline';
    default: return 'outline';
  }
}
function getEstadoRepartoBadgeColor(estado?: string | null) {
    if(!estado) return 'bg-gray-400 text-white';
    switch (estado) {
      case estadoRepartoEnum.Values.asignado:
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case estadoRepartoEnum.Values.en_curso:
        return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case estadoRepartoEnum.Values.completado:
        return 'bg-green-500 hover:bg-green-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  }
function getEstadoEnvioBadgeColor(estado?: string | null) {
  if (!estado) return 'bg-slate-300 text-slate-800';
  switch (estado) {
    case estadoEnvioEnum.Values.pending: return 'bg-gray-500 text-white';
    case estadoEnvioEnum.Values.suggested: return 'bg-purple-500 text-white';
    case estadoEnvioEnum.Values.asignado_a_reparto: return 'bg-blue-500 text-white';
    case estadoEnvioEnum.Values.en_transito: return 'bg-yellow-500 text-black';
    case estadoEnvioEnum.Values.entregado: return 'bg-green-500 text-white';
    case estadoEnvioEnum.Values.cancelado: return 'bg-red-500 text-white';
    case estadoEnvioEnum.Values.problema_entrega: return 'bg-orange-500 text-white';
    default: return 'bg-slate-300 text-slate-800';
  }
}

export function RepartoDetailView({ initialReparto, updateRepartoStatusAction, reorderParadasAction }: RepartoDetailViewProps) {
  const [reparto, setReparto] = useState<RepartoCompleto>(initialReparto);
  const [selectedStatus, setSelectedStatus] = useState<EstadoReparto>(reparto.estado as EstadoReparto);
  const [isUpdatingStatus, startUpdatingStatusTransition] = useTransition();
  const [isReordering, setIsReordering] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setReparto(initialReparto);
    setSelectedStatus(initialReparto.estado as EstadoReparto);
  }, [initialReparto]);

  const handleStatusChange = async () => {
    startUpdatingStatusTransition(async () => {
        const envioIds = reparto.paradas.filter(p => p.envio_id).map(p => p.envio_id as string);
        const result = await updateRepartoStatusAction(reparto.id, selectedStatus, envioIds);
        
        if (result.success) {
            const updatedParadas = reparto.paradas.map(parada => {
                if (!parada.envio) return parada; // Skip pickup points or paradas without envio
                let newEnvioStatus = parada.envio.status;
                if (selectedStatus === estadoRepartoEnum.Values.en_curso) {
                    newEnvioStatus = estadoEnvioEnum.Values.en_transito;
                } else if (selectedStatus === estadoRepartoEnum.Values.completado) {
                    newEnvioStatus = estadoEnvioEnum.Values.entregado;
                } else if (selectedStatus === estadoRepartoEnum.Values.asignado) {
                    newEnvioStatus = estadoEnvioEnum.Values.asignado_a_reparto;
                }
                return {
                    ...parada,
                    envio: { ...parada.envio, status: newEnvioStatus }
                };
            });
            setReparto(prev => ({ ...prev, estado: selectedStatus, paradas: updatedParadas }));
            toast({ title: "Estado Actualizado", description: "El estado del reparto y envíos asociados ha sido actualizado." });
        } else {
            toast({ title: "Error", description: result.error || "No se pudo actualizar el estado.", variant: "destructive" });
            setSelectedStatus(reparto.estado as EstadoReparto);
        }
    });
  };

  const handleReorderParada = async (paradaId: string, direccion: 'up' | 'down') => {
    setIsReordering(paradaId);

    const currentParadas = [...reparto.paradas];
    const currentIndex = currentParadas.findIndex(p => p.id === paradaId);
    if (currentIndex === -1) {
        setIsReordering(null);
        return;
    }

    let newParadas = [...currentParadas];
    const paradaToMove = newParadas[currentIndex];

    if (paradaToMove.orden === 0 && direccion === 'up') { // Cannot move pickup point further up
        setIsReordering(null);
        return;
    }


    if (direccion === 'up' && currentIndex > 0) {
        const temp = newParadas[currentIndex];
        newParadas[currentIndex] = newParadas[currentIndex - 1];
        newParadas[currentIndex - 1] = temp;
        
        const tempOrden = newParadas[currentIndex].orden;
        newParadas[currentIndex].orden = newParadas[currentIndex - 1].orden;
        newParadas[currentIndex - 1].orden = tempOrden;

    } else if (direccion === 'down' && currentIndex < newParadas.length - 1) {
        const temp = newParadas[currentIndex];
        newParadas[currentIndex] = newParadas[currentIndex + 1];
        newParadas[currentIndex + 1] = temp;
       
        const tempOrden = newParadas[currentIndex].orden;
        newParadas[currentIndex].orden = newParadas[currentIndex + 1].orden;
        newParadas[currentIndex + 1].orden = tempOrden;
    } else {
        setIsReordering(null);
        return; 
    }
    
    newParadas.sort((a,b) => a.orden - b.orden);
    setReparto(prev => ({...prev, paradas: newParadas}));


    const result = await reorderParadasAction(reparto.id, paradaId, direccion);
    if (result.success) {
      toast({ title: "Parada Reordenada", description: "El orden de la parada ha sido actualizado." });
    } else {
      toast({ title: "Error al Reordenar", description: result.error || "No se pudo reordenar la parada.", variant: "destructive" });
      setReparto(prev => ({...prev, paradas: currentParadas})); 
    }
    setIsReordering(null);
  };


  const isViajeEmpresaType = reparto.tipo_reparto === tipoRepartoEnum.Values.viaje_empresa || reparto.tipo_reparto === tipoRepartoEnum.Values.viaje_empresa_lote;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Información General del Reparto</CardTitle>
          <CardDescription>ID Reparto: <span className="font-mono text-xs">{reparto.id}</span></CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Reparto</p>
              <p className="font-medium"><ClientSideFormattedDate dateString={reparto.fecha_reparto} /></p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Repartidor</p>
              <p className="font-medium">{reparto.repartidores?.nombre || "No asignado"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Reparto</p>
              <p className="font-medium capitalize">{(reparto.tipo_reparto || 'Desconocido').replace(/_/g, ' ')}</p>
            </div>
          </div>
          {isViajeEmpresaType && reparto.empresas && (
             <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                <p className="text-sm text-muted-foreground">Empresa</p>
                <p className="font-medium">{reparto.empresas.nombre}</p>
                </div>
            </div>
          )}
          {isViajeEmpresaType && reparto.empresas?.direccion && (
             <div className="flex items-start gap-2 p-3 border rounded-md bg-muted/30 md:col-span-2 lg:col-span-1">
                <IconMapPin className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                <p className="text-sm text-muted-foreground">Dirección de Empresa/Retiro</p>
                <p className="font-medium">{reparto.empresas.direccion}</p>
                </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado del Reparto</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Badge variant={getEstadoRepartoBadgeVariant(reparto.estado)} className={`${getEstadoRepartoBadgeColor(reparto.estado || undefined)} text-lg px-4 py-1.5`}>
            {(reparto.estado || 'Desconocido').replace(/_/g, ' ').toUpperCase()}
          </Badge>
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as EstadoReparto)} disabled={isUpdatingStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Cambiar estado..." />
            </SelectTrigger>
            <SelectContent>
              {estadoRepartoEnum.options.map(estadoOpt => (
                <SelectItem key={estadoOpt} value={estadoOpt}>{ (estadoOpt || 'Desconocido').replace(/_/g, ' ').toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleStatusChange} disabled={isUpdatingStatus || selectedStatus === reparto.estado}>
            {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Actualizar Estado
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paradas Asignadas ({reparto.paradas.length})</CardTitle>
           <CardDescription>Secuencia de entrega planificada. Puede ajustar el orden.</CardDescription>
        </CardHeader>
        <CardContent>
          {reparto.paradas.length > 0 ? (
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">Orden</TableHead>
                        <TableHead className="w-20 text-center">Reordenar</TableHead>
                        <TableHead>Destino/Tipo Parada</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Paquete</TableHead>
                        <TableHead>Estado Envío</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {reparto.paradas.map((parada, index) => (
                        <TableRow key={parada.id} className={parada.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa ? "bg-blue-50 dark:bg-blue-900/30" : ""}>
                        <TableCell className="font-medium text-center">{parada.orden + 1}</TableCell>
                        <TableCell className="text-center">
                            <div className="flex justify-center items-center gap-1">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleReorderParada(parada.id, 'up')}
                                    disabled={(parada.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa && parada.orden === 0) || index === 0 || isReordering === parada.id}
                                    title="Mover arriba"
                                >
                                    {isReordering === parada.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleReorderParada(parada.id, 'down')}
                                    disabled={index === reparto.paradas.length - 1 || isReordering === parada.id}
                                    title="Mover abajo"
                                >
                                   {isReordering === parada.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDown className="h-4 w-4" />}
                                </Button>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium flex items-center gap-2">
                                {parada.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa ? <Home className="h-4 w-4 text-blue-600"/> : <User className="h-4 w-4 text-muted-foreground"/>}
                                {parada.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa 
                                    ? `Retiro en ${reparto.empresas?.nombre || 'Empresa'}`
                                    : parada.envio?.clientes ? `${parada.envio.clientes.nombre} ${parada.envio.clientes.apellido}` : parada.envio?.nombre_cliente_temporal || "N/A"
                                }
                            </div>
                            {parada.tipo_parada === tipoParadaSchemaEnum.Values.entrega_cliente && parada.envio?.clientes?.email && 
                                <div className="text-xs text-muted-foreground pl-6">{parada.envio.clientes.email}</div>}
                        </TableCell>
                        <TableCell>
                            {parada.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa 
                                ? reparto.empresas?.direccion 
                                : parada.envio?.client_location
                            }
                        </TableCell>
                        <TableCell>
                            {parada.tipo_parada === tipoParadaSchemaEnum.Values.entrega_cliente && parada.envio
                                ? `${parada.envio.package_size || '-'}, ${parada.envio.package_weight || '-'}kg`
                                : <span className="text-muted-foreground">-</span>
                            }
                        </TableCell>
                        <TableCell>
                            {parada.tipo_parada === tipoParadaSchemaEnum.Values.entrega_cliente && parada.envio?.status ? (
                                <Badge className={`${getEstadoEnvioBadgeColor(parada.envio.status)} capitalize`}>
                                    {(parada.envio.status).replace(/_/g, ' ')}
                                </Badge>
                            ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
          ) : (
            <p className="text-muted-foreground">No hay paradas asignadas a este reparto.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
