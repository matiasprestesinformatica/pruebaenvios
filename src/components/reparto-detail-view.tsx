
"use client";

import type { RepartoCompleto, EnvioConCliente } from "@/types/supabase";
import type { EstadoReparto } from "@/lib/schemas";
import { estadoRepartoEnum, estadoEnvioEnum } from "@/lib/schemas";
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
import { User, CalendarDays, Truck, Building, Package, MapPin, Weight, AlertTriangle, Loader2 } from "lucide-react";

interface RepartoDetailViewProps {
  initialReparto: RepartoCompleto;
  updateRepartoStatusAction: (repartoId: string, nuevoEstado: EstadoReparto, envioIds: string[]) => Promise<{ success: boolean; error?: string | null }>;
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

function getEstadoRepartoBadgeVariant(estado: string) {
  switch (estado) {
    case estadoRepartoEnum.Values.asignado: return 'default';
    case estadoRepartoEnum.Values.en_curso: return 'secondary';
    case estadoRepartoEnum.Values.completado: return 'outline';
    default: return 'outline';
  }
}
function getEstadoRepartoBadgeColor(estado: string) {
    switch (estado) {
      case estadoRepartoEnum.Values.asignado: return 'bg-blue-500 hover:bg-blue-600 text-white';
      case estadoRepartoEnum.Values.en_curso: return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case estadoRepartoEnum.Values.completado: return 'bg-green-500 hover:bg-green-600 text-white';
      default: return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
}
function getEstadoEnvioBadgeColor(estado: string) {
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

export function RepartoDetailView({ initialReparto, updateRepartoStatusAction }: RepartoDetailViewProps) {
  const [reparto, setReparto] = useState<RepartoCompleto>(initialReparto);
  const [selectedStatus, setSelectedStatus] = useState<EstadoReparto>(reparto.estado as EstadoReparto);
  const [isUpdating, setIsUpdating] = useTransition();
  const { toast } = useToast();

  const handleStatusChange = async () => {
    setIsUpdating(async () => {
        const envioIds = reparto.envios_asignados.map(envio => envio.id);
        const result = await updateRepartoStatusAction(reparto.id, selectedStatus, envioIds);
        if (result.success) {
            setReparto(prev => ({ ...prev, estado: selectedStatus }));
            if(selectedStatus === estadoRepartoEnum.Values.completado) {
                // Refresh envios status locally if parent status becomes 'completado'
                setReparto(prev => ({
                    ...prev,
                    envios_asignados: prev.envios_asignados.map(e => ({...e, status: estadoEnvioEnum.Values.entregado}))
                }));
            }
            toast({ title: "Estado Actualizado", description: "El estado del reparto ha sido actualizado." });
        } else {
            toast({ title: "Error", description: result.error || "No se pudo actualizar el estado.", variant: "destructive" });
            setSelectedStatus(reparto.estado as EstadoReparto); // Revert select on error
        }
    });
  };

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
              <p className="font-medium capitalize">{reparto.tipo_reparto.replace('_', ' ')}</p>
            </div>
          </div>
          {reparto.tipo_reparto === 'viaje_empresa' && reparto.empresas && (
             <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30 md:col-span-2 lg:col-span-1">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                <p className="text-sm text-muted-foreground">Empresa</p>
                <p className="font-medium">{reparto.empresas.nombre}</p>
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
          <Badge variant={getEstadoRepartoBadgeVariant(reparto.estado)} className={`${getEstadoRepartoBadgeColor(reparto.estado)} text-lg px-4 py-1.5`}>
            {reparto.estado.replace('_', ' ').toUpperCase()}
          </Badge>
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as EstadoReparto)} disabled={isUpdating}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Cambiar estado..." />
            </SelectTrigger>
            <SelectContent>
              {estadoRepartoEnum.options.map(estado => (
                <SelectItem key={estado} value={estado}>{estado.replace('_', ' ').toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleStatusChange} disabled={isUpdating || selectedStatus === reparto.estado}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Actualizar Estado
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Envíos Asignados ({reparto.envios_asignados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reparto.envios_asignados.length > 0 ? (
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Cliente/Destino</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Paquete</TableHead>
                        <TableHead>Estado Envío</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {reparto.envios_asignados.map((envio) => (
                        <TableRow key={envio.id}>
                        <TableCell>
                            <div className="font-medium">
                            {envio.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}` : envio.nombre_cliente_temporal || "N/A"}
                            </div>
                            {envio.clientes?.email && <div className="text-xs text-muted-foreground">{envio.clientes.email}</div>}
                        </TableCell>
                        <TableCell>{envio.client_location}</TableCell>
                        <TableCell>{envio.package_size}, {envio.package_weight}kg</TableCell>
                        <TableCell>
                            <Badge className={`${getEstadoEnvioBadgeColor(envio.status)} capitalize`}>
                                {envio.status.replace('_', ' ')}
                            </Badge>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
          ) : (
            <p className="text-muted-foreground">No hay envíos asignados a este reparto.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
