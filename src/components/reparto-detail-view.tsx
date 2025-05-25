
"use client";

import type { RepartoCompleto, ParadaConEnvioYCliente, Empresa, TipoParadaEnum as TipoParadaEnumType } from "@/types/supabase";
import type { EstadoReparto } from "@/lib/schemas";
import { estadoRepartoEnum, tipoRepartoEnum, tipoParadaEnum as tipoParadaSchemaEnum } from "@/lib/schemas";
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
import { useState, useEffect, useTransition, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { User, CalendarDays, Truck, Building, Loader2, MapPin, ArrowUp, ArrowDown, Home, Wand2, Brain, AlertTriangle, CheckCircle, DollarSign, InfoIcon } from "lucide-react";
import type { OptimizeRouteInput, OptimizeRouteOutput, OptimizeRouteStopInput } from "@/ai/flows/optimize-route-flow";
import { loadGoogleMapsApi } from '@/lib/google-maps-loader'; // Use shared loader

interface RepartoDetailViewProps {
  initialReparto: RepartoCompleto;
  updateRepartoStatusAction: (repartoId: string, nuevoEstado: EstadoReparto, envioIds: string[]) => Promise<{ success: boolean; error?: string | null }>;
  reorderParadasAction: (repartoId: string, paradaId: string, direccion: 'up' | 'down') => Promise<{ success: boolean; error?: string | null }>;
  optimizeRouteAction: (paradasInput: OptimizeRouteInput) => Promise<{ success: boolean; data?: OptimizeRouteOutput | null; error?: string | null }>;
  applyOptimizedRouteOrderAction: (repartoId: string, orderedStopInputIds: string[]) => Promise<{ success: boolean; error?: string | null }>;
}

interface ParadaMapaInfo {
    id: string;
    lat: number;
    lng: number;
    label?: string; 
    type?: 'pickup' | 'delivery';
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

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return `$ ${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RepartoDetailView({ 
    initialReparto, 
    updateRepartoStatusAction, 
    reorderParadasAction, 
    optimizeRouteAction,
    applyOptimizedRouteOrderAction
}: RepartoDetailViewProps) {
  const [reparto, setReparto] = useState<RepartoCompleto>(initialReparto);
  const [selectedStatus, setSelectedStatus] = useState<EstadoReparto>(reparto.estado as EstadoReparto);
  const [isUpdatingStatus, startUpdatingStatusTransition] = useTransition();
  const [isReordering, setIsReordering] = useState<string | null>(null);
  const [isOptimizingRoute, setIsOptimizingRoute] = useState(false);
  const [suggestedRoute, setSuggestedRoute] = useState<OptimizeRouteOutput | null>(null);
  const [isApplyingRouteOrder, setIsApplyingRouteOrder] = useState(false);
  
  const [googleApiLoadedState, setGoogleApiLoadedState] = useState<boolean>(false);
  const [mapApiLoading, setMapApiLoading] = useState<boolean>(true);
  const [errorLoadingMaps, setErrorLoadingMaps] = useState<string | null>(null);

  const [currentRouteDistanceKm, setCurrentRouteDistanceKm] = useState<number | null>(null);
  const [isLoadingCurrentRouteDistance, setIsLoadingCurrentRouteDistance] = useState(false);
  const [aiCalculatedDistanceKm, setAiCalculatedDistanceKm] = useState<number | null>(null);
  const [isLoadingAiRouteDistance, setIsLoadingAiRouteDistance] = useState(false);
  const [originalValidStopsForAISuggestion, setOriginalValidStopsForAISuggestion] = useState<ParadaMapaInfo[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadGoogleMapsApi()
      .then(() => {
        setGoogleApiLoadedState(true);
        setErrorLoadingMaps(null);
      })
      .catch((err: Error) => {
        console.error("Failed to load Google Maps API in RepartoDetailView:", err);
        setErrorLoadingMaps(err.message || "Error al cargar el servicio de mapas para cálculo de distancia.");
        setGoogleApiLoadedState(false);
      })
      .finally(() => {
        setMapApiLoading(false);
      });
  }, []);


  useEffect(() => {
    setReparto(initialReparto);
    setSelectedStatus(initialReparto.estado as EstadoReparto);
    setCurrentRouteDistanceKm(null); 
    setAiCalculatedDistanceKm(null); 
    setSuggestedRoute(null);
  }, [initialReparto]);

  const getParadasMapaInfo = useCallback((paradas: ParadaConEnvioYCliente[], empresa?: Empresa | null): ParadaMapaInfo[] => {
    return paradas
      .map(parada => {
        if (parada.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa && empresa?.latitud != null && empresa?.longitud != null) {
          return { id: `empresa-${empresa.id}`, lat: empresa.latitud, lng: empresa.longitud, label: `Retiro en ${empresa.nombre || 'Empresa'}`, type: 'pickup' as const };
        } else if (parada.envio?.latitud != null && parada.envio?.longitud != null) {
          return { id: parada.id, lat: parada.envio.latitud, lng: parada.envio.longitud, label: parada.envio.clientes?.nombre || parada.envio.nombre_cliente_temporal || 'Envío', type: 'delivery' as const };
        }
        return null;
      })
      .filter(p => p !== null) as ParadaMapaInfo[];
  }, []);

  const calculateRouteDistance = useCallback(async (paradasInfo: ParadaMapaInfo[]): Promise<number | null> => {
    if (!googleApiLoadedState || paradasInfo.length < 2) return paradasInfo.length <=1 ? 0 : null;
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      console.warn("Google Maps API Key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) is not set. Cannot calculate route distance.");
      setErrorLoadingMaps("API Key de Google Maps no configurada. No se puede calcular distancia.");
      return null;
    }
    if (!window.google?.maps?.DirectionsService) {
        console.warn("Google Maps DirectionsService is not available.");
        setErrorLoadingMaps("Servicio de Direcciones de Google Maps no disponible.");
        return null;
    }


    const directionsService = new window.google.maps.DirectionsService();
    const origin = { lat: paradasInfo[0].lat, lng: paradasInfo[0].lng };
    const destination = { lat: paradasInfo[paradasInfo.length - 1].lat, lng: paradasInfo[paradasInfo.length - 1].lng };
    const waypoints = paradasInfo.slice(1, -1).map(p => ({ location: { lat: p.lat, lng: p.lng }, stopover: true }));

    return new Promise((resolve) => {
      directionsService.route(
        {
          origin: origin,
          destination: destination,
          waypoints: waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            let totalDistance = 0;
            result.routes[0].legs.forEach((leg) => {
              if (leg.distance) {
                totalDistance += leg.distance.value;
              }
            });
            resolve(totalDistance / 1000); 
          } else {
            console.error(`Error fetching directions ${status}`, result);
            toast({ title: "Error de Ruta", description: `Google Maps no pudo calcular la ruta: ${status}`, variant: "destructive" });
            resolve(null);
          }
        }
      );
    });
  }, [googleApiLoadedState, toast]);

  useEffect(() => {
    const calculateAndSetCurrentRouteDistance = async () => {
      if (reparto.paradas && reparto.paradas.length > 1 && googleApiLoadedState) {
        setIsLoadingCurrentRouteDistance(true);
        const paradasInfo = getParadasMapaInfo(reparto.paradas, reparto.empresas);
        if (paradasInfo.length > 1) {
            const distance = await calculateRouteDistance(paradasInfo);
            setCurrentRouteDistanceKm(distance);
        } else {
            setCurrentRouteDistanceKm(0);
        }
        setIsLoadingCurrentRouteDistance(false);
      } else {
        setCurrentRouteDistanceKm(reparto.paradas && reparto.paradas.length <=1 ? 0 : null);
      }
    };
    if (googleApiLoadedState) { 
        calculateAndSetCurrentRouteDistance();
    }
  }, [reparto.paradas, reparto.empresas, googleApiLoadedState, calculateRouteDistance, getParadasMapaInfo]);

  const geocodableParadasCount = useMemo(() => {
    let count = 0;
    if (reparto.empresas?.latitud != null && reparto.empresas?.longitud != null && reparto.paradas.some(p => p.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa)) {
      count++;
    }
    reparto.paradas.forEach(parada => {
      if (parada.tipo_parada === tipoParadaSchemaEnum.Values.entrega_cliente && parada.envio?.latitud != null && parada.envio?.longitud != null) {
        count++;
      }
    });
    return count;
  }, [reparto.paradas, reparto.empresas]);

  const handleStatusChange = async () => {
    startUpdatingStatusTransition(async () => {
        const envioIds = reparto.paradas.filter(p => !!p.envio_id).map(p => p.envio_id as string);
        const result = await updateRepartoStatusAction(reparto.id, selectedStatus, envioIds);

        if (result.success) {
            let newEnvioStatusForOptimisticUpdate: string | null = null;
            if (selectedStatus === estadoRepartoEnum.Values.en_curso) newEnvioStatusForOptimisticUpdate = estadoEnvioEnum.Values.en_transito;
            else if (selectedStatus === estadoRepartoEnum.Values.completado) newEnvioStatusForOptimisticUpdate = estadoEnvioEnum.Values.entregado;
            else if (selectedStatus === estadoRepartoEnum.Values.asignado) newEnvioStatusForOptimisticUpdate = estadoEnvioEnum.Values.asignado_a_reparto;
            
            setReparto(prev => ({ 
                ...prev, 
                estado: selectedStatus,
                paradas: prev.paradas.map(p => 
                    p.envio && newEnvioStatusForOptimisticUpdate 
                    ? { ...p, envio: { ...p.envio, status: newEnvioStatusForOptimisticUpdate } } 
                    : p
                )
            }));
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
    let newParadasOptimistic = [...currentParadas];
    const paradaToMove = newParadasOptimistic[currentIndex];

    if (paradaToMove.orden === 0 && direccion === 'up' && paradaToMove.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa) {
         setIsReordering(null);
         return;
    }
     if (currentIndex === 0 && direccion === 'up' && (paradaToMove.tipo_parada !== tipoParadaSchemaEnum.Values.retiro_empresa || paradaToMove.orden !== 0) ) {
         setIsReordering(null);
         return;
    }

    if (direccion === 'up' && currentIndex > 0) {
        const temp = newParadasOptimistic[currentIndex];
        newParadasOptimistic[currentIndex] = newParadasOptimistic[currentIndex - 1];
        newParadasOptimistic[currentIndex - 1] = temp;
        const tempOrden = newParadasOptimistic[currentIndex].orden;
        newParadasOptimistic[currentIndex].orden = newParadasOptimistic[currentIndex - 1].orden;
        newParadasOptimistic[currentIndex - 1].orden = tempOrden;
    } else if (direccion === 'down' && currentIndex < newParadasOptimistic.length - 1) {
        const temp = newParadasOptimistic[currentIndex];
        newParadasOptimistic[currentIndex] = newParadasOptimistic[currentIndex + 1];
        newParadasOptimistic[currentIndex + 1] = temp;
        const tempOrden = newParadasOptimistic[currentIndex].orden;
        newParadasOptimistic[currentIndex].orden = newParadasOptimistic[currentIndex + 1].orden;
        newParadasOptimistic[currentIndex + 1].orden = tempOrden;
    } else {
        setIsReordering(null);
        return;
    }
    newParadasOptimistic.sort((a,b) => a.orden - b.orden); 
    setReparto(prev => ({...prev, paradas: newParadasOptimistic}));

    const result = await reorderParadasAction(reparto.id, paradaId, direccion);
    if (!result.success) {
      toast({ title: "Error al Reordenar", description: result.error || "No se pudo reordenar la parada.", variant: "destructive" });
      setReparto(prev => ({...prev, paradas: currentParadas})); 
    }
    setIsReordering(null);
  };

  const handleOptimizeRoute = async () => {
    setIsOptimizingRoute(true);
    setSuggestedRoute(null);
    setAiCalculatedDistanceKm(null);

    const validStops: OptimizeRouteStopInput[] = reparto.paradas.reduce((acc, parada) => {
        if (parada.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa) {
            if (reparto.empresas?.latitud != null && reparto.empresas?.longitud != null) {
                acc.push({
                    id: `empresa-${reparto.empresas.id}`, 
                    label: reparto.empresas.nombre || 'Punto de Retiro',
                    lat: reparto.empresas.latitud,
                    lng: reparto.empresas.longitud,
                    type: 'pickup'
                });
            }
        } else if (parada.envio?.latitud != null && parada.envio?.longitud != null) {
            acc.push({
                id: parada.id, 
                label: parada.envio.clientes?.nombre || parada.envio.nombre_cliente_temporal || 'Entrega Cliente',
                lat: parada.envio.latitud,
                lng: parada.envio.longitud,
                type: 'delivery'
            });
        }
        return acc;
    }, [] as OptimizeRouteStopInput[]);
    
    setOriginalValidStopsForAISuggestion(validStops); 

    if (validStops.length < 2) {
      toast({ title: "Optimización de Ruta", description: "Se necesitan al menos dos paradas con coordenadas válidas para optimizar.", variant: "destructive" });
      setIsOptimizingRoute(false);
      return;
    }

    const result = await optimizeRouteAction({ stops: validStops });
    if (result.success && result.data) {
      setSuggestedRoute(result.data);
      toast({ title: "Ruta Optimizada Sugerida", description: result.data.notes || "La IA ha sugerido un nuevo orden para las paradas." });
      if (result.data.estimated_total_distance_km === undefined && result.data.optimized_stop_ids.length > 0) {
         handleCalculateAiRouteDistance(result.data, validStops); 
      }
    } else {
      toast({ title: "Error de Optimización", description: result.error || "No se pudo obtener una ruta optimizada de la IA.", variant: "destructive" });
    }
    setIsOptimizingRoute(false);
  };
  
  const handleCalculateAiRouteDistance = async (aiRoute: OptimizeRouteOutput, originalStopsForCalc: ParadaMapaInfo[]) => {
    if (!aiRoute || !aiRoute.optimized_stop_ids || !googleApiLoadedState) return;
    setIsLoadingAiRouteDistance(true);

    const paradasInfoMap = new Map(originalStopsForCalc.map(p => [p.id, p]));
    
    const orderedStopsForAiRoute: ParadaMapaInfo[] = aiRoute.optimized_stop_ids
        .map(stopId => {
            const stopInfo = paradasInfoMap.get(stopId);
            if (stopInfo) {
                return { id: stopInfo.id, lat: stopInfo.lat, lng: stopInfo.lng, label: stopInfo.label, type: stopInfo.type as 'pickup' | 'delivery' };
            }
            return undefined;
        })
        .filter(p => p !== undefined) as ParadaMapaInfo[];

    if (orderedStopsForAiRoute.length < 2) {
        toast({ title: "Error de Cálculo", description: "No hay suficientes paradas válidas en la ruta sugerida para calcular la distancia.", variant: "destructive" });
        setIsLoadingAiRouteDistance(false);
        return;
    }

    const distance = await calculateRouteDistance(orderedStopsForAiRoute);
    setAiCalculatedDistanceKm(distance);
    setIsLoadingAiRouteDistance(false);
  };

  const handleApplyOptimizedRoute = async () => {
    if (!suggestedRoute || !suggestedRoute.optimized_stop_ids || suggestedRoute.optimized_stop_ids.length === 0) {
      toast({ title: "Error", description: "No hay una ruta sugerida para aplicar.", variant: "destructive" });
      return;
    }
    setIsApplyingRouteOrder(true);
    const result = await applyOptimizedRouteOrderAction(reparto.id, suggestedRoute.optimized_stop_ids);
    if (result.success) {
      toast({ title: "Ruta Aplicada", description: "El orden de las paradas ha sido actualizado. La página se refrescará." });
      setSuggestedRoute(null); 
    } else {
      toast({ title: "Error al Aplicar Ruta", description: result.error || "No se pudo aplicar el nuevo orden.", variant: "destructive" });
    }
    setIsApplyingRouteOrder(false);
  };

  const totalRepartoValue = useMemo(() => {
    if (!reparto || !reparto.paradas) return 0;
    return reparto.paradas.reduce((sum, parada) => {
      if (parada.tipo_parada === tipoParadaSchemaEnum.Values.entrega_cliente && parada.envio?.precio_servicio_final != null) {
        return sum + parada.envio.precio_servicio_final;
      }
      return sum;
    }, 0);
  }, [reparto.paradas]);


  const isViajeEmpresaType = reparto.tipo_reparto === tipoRepartoEnum.Values.viaje_empresa || reparto.tipo_reparto === tipoRepartoEnum.Values.viaje_empresa_lote;

  const paradasMap = useMemo(() => {
    const map = new Map<string, ParadaConEnvioYCliente | { type: 'pickup'; details: Empresa }>();
    reparto.paradas.forEach(parada => {
      if (parada.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa && reparto.empresas) {
        map.set(`empresa-${reparto.empresas.id}`, { type: 'pickup', details: reparto.empresas });
      } else if (parada.id) { 
        map.set(parada.id, parada); 
      }
    });
    return map;
  }, [reparto.paradas, reparto.empresas]);


  return (
    <div className="space-y-6">
      {(!googleApiLoadedState || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || errorLoadingMaps) && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Advertencia del Servicio de Mapas</AlertTitle>
          <AlertDescription>
            {errorLoadingMaps || (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "La API Key de Google Maps no está configurada. " : "El servicio de mapas no está completamente cargado. ")}
            El cálculo de distancia de ruta podría no funcionar.
          </AlertDescription>
        </Alert>
      )}
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
             <div className="flex items-start gap-2 p-3 border rounded-md bg-muted/30 md:col-span-1 lg:col-span-2">
                <MapPin className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                <p className="text-sm text-muted-foreground">Dirección Retiro Inicial</p>
                <p className="font-medium">{reparto.empresas.direccion}</p>
                </div>
            </div>
          )}
          <div className="flex items-center gap-2 p-3 border rounded-md bg-accent/20 text-accent-foreground">
            <DollarSign className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm text-muted-foreground">Valor Total del Reparto</p>
              <p className="font-semibold text-lg">{formatCurrency(totalRepartoValue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado del Reparto</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Badge className={`${getEstadoRepartoBadgeColor(reparto.estado || undefined)} text-lg px-4 py-1.5 capitalize`}>
            {(reparto.estado || 'Desconocido').replace(/_/g, ' ')}
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
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div>
            <CardTitle>
                Paradas Asignadas ({reparto.paradas.length})
                {isLoadingCurrentRouteDistance && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}
                {currentRouteDistanceKm !== null && !isLoadingCurrentRouteDistance && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                        (Ruta Actual Aprox: {currentRouteDistanceKm.toFixed(1)} km)
                    </span>
                )}
            </CardTitle>
            <CardDescription>Secuencia de entrega planificada. Puede ajustar el orden o solicitar una optimización por IA.</CardDescription>
          </div>
          <Button onClick={handleOptimizeRoute} disabled={isOptimizingRoute || geocodableParadasCount < 2 || mapApiLoading || !googleApiLoadedState} className="mt-2 md:mt-0">
            {isOptimizingRoute ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
            Optimizar Ruta (IA)
          </Button>
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
                        <TableHead className="text-right">Valor Servicio</TableHead>
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
                                    disabled={(parada.tipo_parada === tipoParadaSchemaEnum.Values.retiro_empresa && parada.orden === 0) || (index === 0 && parada.tipo_parada !== tipoParadaSchemaEnum.Values.retiro_empresa) || isReordering === parada.id}
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
                                ? `${parada.envio.tipos_paquete?.nombre || '-'}, ${parada.envio.package_weight || '-'}kg`
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
                         <TableCell className="text-right">
                            {parada.tipo_parada === tipoParadaSchemaEnum.Values.entrega_cliente && parada.envio
                                ? (
                                    <>
                                        {formatCurrency(parada.envio.precio_servicio_final)}
                                        {parada.envio.tipos_servicio?.nombre && (
                                            <div className="text-xs text-muted-foreground truncate">
                                            ({parada.envio.tipos_servicio.nombre})
                                            </div>
                                        )}
                                    </>
                                  )
                                : <span className="text-muted-foreground">-</span>
                            }
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

      {suggestedRoute && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-accent" />
              Ruta Optimizada Sugerida (IA)
              {suggestedRoute.estimated_total_distance_km !== undefined && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                    (IA Aprox: {suggestedRoute.estimated_total_distance_km.toFixed(1)} km)
                </span>
              )}
              {suggestedRoute.estimated_total_distance_km === undefined && aiCalculatedDistanceKm !== null && !isLoadingAiRouteDistance && (
                 <span className="text-sm font-normal text-muted-foreground ml-2">
                    (Calculado Aprox: {aiCalculatedDistanceKm.toFixed(1)} km)
                </span>
              )}
            </CardTitle>
            {suggestedRoute.notes && (
                <CardDescription>{suggestedRoute.notes}</CardDescription>
            )}
            {suggestedRoute.estimated_total_distance_km === undefined && (
                 <Button 
                    onClick={() => handleCalculateAiRouteDistance(suggestedRoute, originalValidStopsForAISuggestion)} 
                    disabled={isLoadingAiRouteDistance || mapApiLoading || !googleApiLoadedState}
                    size="sm"
                    variant="outline"
                    className="mt-2"
                 >
                    {isLoadingAiRouteDistance ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                    Calcular Distancia (Ruta Sugerida)
                </Button>
            )}
          </CardHeader>
          <CardContent>
            {suggestedRoute.optimized_stop_ids.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-12">Nuevo Orden</TableHead>
                        <TableHead>Destino/Tipo Parada</TableHead>
                        <TableHead>Ubicación</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suggestedRoute.optimized_stop_ids.map((stopId, index) => {
                        const paradaInfo = paradasMap.get(stopId);
                        if (!paradaInfo) {
                            console.warn(`AI suggested stopId "${stopId}" not found in current paradasMap.`);
                            return (
                            <TableRow key={`${stopId}-${index}-missing`}>
                                <TableCell colSpan={3} className="text-destructive text-center">
                                    Parada sugerida con ID '{stopId}' no encontrada en los datos actuales del reparto.
                                </TableCell>
                            </TableRow>
                            );
                        }

                        let label, location;
                        let isPickup = false;
                        if ('type' in paradaInfo && paradaInfo.type === 'pickup') { 
                            label = `Retiro en ${paradaInfo.details.nombre}`;
                            location = paradaInfo.details.direccion;
                            isPickup = true;
                        } else { 
                            const paradaEnvioCliente = paradaInfo as ParadaConEnvioYCliente;
                            const envio = paradaEnvioCliente.envio;
                            label = envio?.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}` : envio?.nombre_cliente_temporal || 'N/A';
                            location = envio?.client_location;
                        }

                        return (
                            <TableRow key={`${stopId}-${index}`} className={isPickup ? "bg-blue-50 dark:bg-blue-900/30" : ""}>
                            <TableCell className="font-medium text-center">{index + 1}</TableCell>
                            <TableCell>
                                <div className="font-medium flex items-center gap-2">
                                {isPickup ? <Home className="h-4 w-4 text-blue-600"/> : <User className="h-4 w-4 text-muted-foreground"/>}
                                {label}
                                </div>
                            </TableCell>
                            <TableCell>{location || 'N/A'}</TableCell>
                            </TableRow>
                        );
                        })}
                    </TableBody>
                    </Table>
                </div>
                <Button onClick={handleApplyOptimizedRoute} disabled={isApplyingRouteOrder} className="w-full sm:w-auto">
                    {isApplyingRouteOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Aplicar Ruta Sugerida
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">La IA no pudo generar una ruta optimizada o no hay paradas válidas.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
