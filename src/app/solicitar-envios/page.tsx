
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { SolicitarEnvioForm } from "@/components/solicitar-envio-form";
import { getTarifasCalculadoraAction } from "@/app/calculadora/actions";
import { getTiposPaqueteActivosAction, getTiposServicioActivosAction } from "@/app/configuracion/actions";
import { createEnvioIndividualAction } from "./actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, Info, MapPinIcon, Calculator, Loader2, Edit, PackageSearch } from "lucide-react";
import type { TarifaDistanciaCalculadora, TipoPaquete, TipoServicio } from "@/types/supabase";
import { useToast } from "@/hooks/use-toast";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_SCRIPT_ID_SOLICITAR = 'google-maps-api-script-solicitar-envio'; // More specific ID
const MAR_DEL_PLATA_CENTER = { lat: -38.0055, lng: -57.5426 }; // Center coordinates for Mar del Plata

declare global {
  interface Window {
    initMapGloballyForSolicitarEnvioPage?: () => void;
  }
}

export default function SolicitarEnviosPage() {
  const [step, setStep] = useState(1);
  const [origen, setOrigen] = useState<string>('');
  const [destino, setDestino] = useState<string>('');
  const [distancia, setDistancia] = useState<string | null>(null);
  const [precioCotizado, setPrecioCotizado] = useState<number | null>(null);
  const [origenCoords, setOrigenCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [loadingCalculation, setLoadingCalculation] = useState<boolean>(false);
  const [errorCalculation, setErrorCalculation] = useState<string | null>(null);

  const [loadingInitialData, setLoadingInitialData] = useState<boolean>(true);
  const [errorInitialData, setErrorInitialData] = useState<string | null>(null);
  const [tarifasExpress, setTarifasExpress] = useState<TarifaDistanciaCalculadora[]>([]);
  const [tiposPaqueteActivos, setTiposPaqueteActivos] = useState<Pick<TipoPaquete, 'id' | 'nombre'>[]>([]);
  const [tiposServicioActivos, setTiposServicioActivos] = useState<Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[]>([]);
  const { toast } = useToast();

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const marcadorOrigenRef = useRef<google.maps.Marker | null>(null);
  const marcadorDestinoRef = useRef<google.maps.Marker | null>(null);

  const initMap = useCallback(() => {
    if (!window.google || !window.google.maps || !mapRef.current || mapInstanceRef.current) return;
    const map = new window.google.maps.Map(mapRef.current!, {
      zoom: 12, center: marDelPlata, mapTypeControl: false, streetViewControl: false,
    });
    mapInstanceRef.current = map;
    directionsServiceRef.current = new window.google.maps.DirectionsService();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({ map: map, suppressMarkers: true });
  }, []);

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID_SOLICITAR) || window.google?.maps) {
        if (window.google?.maps && !mapInstanceRef.current && step === 1) initMap(); // Init map only if on step 1
        return;
      }
      if (!GOOGLE_MAPS_API_KEY) {
        setErrorCalculation("Falta la configuración del mapa. Contacta al administrador.");
        return;
      }
      (window as any).initMapGloballyForSolicitarEnvioPage = initMap;
      const script = document.createElement('script');
      script.id = GOOGLE_MAPS_SCRIPT_ID_SOLICITAR;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMapGloballyForSolicitarEnvioPage&libraries=marker,geometry&loading=async`;
      script.async = true; script.defer = true;
      script.onerror = () => setErrorCalculation("Error al cargar el script del mapa.");
      document.head.appendChild(script);
    };

    if (typeof window !== 'undefined' && step === 1) { // Only load maps script if on step 1
      loadGoogleMaps();
    }
    
    return () => { 
      if ((window as any).initMapGloballyForSolicitarEnvioPage) {
        delete (window as any).initMapGloballyForSolicitarEnvioPage;
      }
    };
  }, [initMap, step]);

  useEffect(() => {
    async function fetchInitialData() {
      setLoadingInitialData(true);
      setErrorInitialData(null);
      try {
        const [tarifasResult, paquetesResult, serviciosResult] = await Promise.all([
          getTarifasCalculadoraAction('express'),
          getTiposPaqueteActivosAction(),
          getTiposServicioActivosAction(),
        ]);

        if (tarifasResult.error || !tarifasResult.data || tarifasResult.data.length === 0) {
          throw new Error(tarifasResult.error || "No se encontraron tarifas Express para cotizar.");
        }
        setTarifasExpress(tarifasResult.data);

        if (!paquetesResult || paquetesResult.length === 0) {
            console.warn("No se encontraron tipos de paquete activos.");
        }
        setTiposPaqueteActivos(paquetesResult || []);
        
        if(!serviciosResult || serviciosResult.length === 0){
            console.warn("No se encontraron tipos de servicio activos.");
        }
        setTiposServicioActivos(serviciosResult || []);

      } catch (err) {
        const error = err as Error;
        setErrorInitialData(error.message || "Error al cargar datos de configuración para la solicitud.");
        toast({
          title: "Error de Configuración",
          description: error.message || "No se pudieron cargar los datos necesarios para el formulario.",
          variant: "destructive",
        });
      } finally {
        setLoadingInitialData(false);
      }
    }
    fetchInitialData();
  }, [toast]);

  const calcularPrecioConTarifas = (distanciaKm: number) => {
    if (!tarifasExpress || tarifasExpress.length === 0) return null;
    for (const tarifa of tarifasExpress) {
      if (distanciaKm <= tarifa.distancia_hasta_km) {
        return tarifa.precio;
      }
    }
    const lastTier = tarifasExpress[tarifasExpress.length - 1];
    if (lastTier && distanciaKm > lastTier.distancia_hasta_km && lastTier.distancia_hasta_km >= 10.0) { 
        const kmExtra = Math.ceil(distanciaKm - lastTier.distancia_hasta_km);
        const precioPorKmExtra = tarifasExpress.find(t => t.distancia_hasta_km === -1)?.precio || 750; // Special tier or default
        return lastTier.precio + (kmExtra * precioPorKmExtra);
    }
    return null;
  };

  const colocarMarcadores = (
    origenPos: google.maps.LatLng,
    destinoPos: google.maps.LatLng,
    origenDir: string,
    destinoDir: string
  ) => {
    if (!window.google?.maps || !mapInstanceRef.current) return;
    if (marcadorOrigenRef.current) marcadorOrigenRef.current.setMap(null);
    if (marcadorDestinoRef.current) marcadorDestinoRef.current.setMap(null);
    
    marcadorOrigenRef.current = new window.google.maps.Marker({
      position: origenPos, map: mapInstanceRef.current,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "hsl(var(--primary))", fillOpacity: 1, strokeColor: "hsl(var(--primary-foreground))", strokeWeight: 2 },
      title: "Origen: " + origenDir, animation: window.google.maps.Animation.DROP,
    });
    marcadorDestinoRef.current = new window.google.maps.Marker({
      position: destinoPos, map: mapInstanceRef.current,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "hsl(var(--accent))", fillOpacity: 1, strokeColor: "hsl(var(--accent-foreground))", strokeWeight: 2 },
      title: "Destino: " + destinoDir, animation: window.google.maps.Animation.DROP,
    });

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(origenPos); bounds.extend(destinoPos);
    mapInstanceRef.current.fitBounds(bounds);
    if (mapInstanceRef.current.getZoom()! > 15) mapInstanceRef.current.setZoom(15);
  };

  const handleCalcularYContinuar = async () => {
    if (!origen || !destino) {
      setErrorCalculation("Por favor, ingrese ambas direcciones.");
      return;
    }
    if (!directionsServiceRef.current || !directionsRendererRef.current || !window.google?.maps) {
      setErrorCalculation("El servicio de mapas no está listo. Intente de nuevo.");
      return;
    }
    setLoadingCalculation(true);
    setErrorCalculation(null);
    setDistancia(null);
    setPrecioCotizado(null);
    setOrigenCoords(null);
    setDestinoCoords(null);

    try {
      const response = await directionsServiceRef.current.route({
        origin: `${origen}, Mar del Plata, Argentina`,
        destination: `${destino}, Mar del Plata, Argentina`,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections(response);
      }
      const route = response.routes[0];
      if (route?.legs?.[0]) {
        const leg = route.legs[0];
        const distanciaTexto = leg.distance?.text || "N/A";
        const distanciaValorKm = (leg.distance?.value || 0) / 1000;
        const precioCalc = calcularPrecioConTarifas(distanciaValorKm);

        setDistancia(distanciaTexto);
        setPrecioCotizado(precioCalc);

        if (leg.start_location) setOrigenCoords({ lat: leg.start_location.lat(), lng: leg.start_location.lng() });
        if (leg.end_location) setDestinoCoords({ lat: leg.end_location.lat(), lng: leg.end_location.lng() });
        
        if (precioCalc !== null) {
          setStep(2);
        } else {
          setErrorCalculation("No se pudo calcular un precio para la distancia. Consulte por WhatsApp.");
        }
        if (leg.start_location && leg.end_location && leg.start_address && leg.end_address) {
            colocarMarcadores(leg.start_location, leg.end_location, leg.start_address, leg.end_address);
        }
      } else {
        throw new Error("No se pudo obtener la información de la ruta.");
      }
    } catch (e) {
      console.error("Error al calcular la ruta:", e);
      setErrorCalculation("No se pudo calcular la ruta. Asegúrese de que las direcciones sean válidas en Mar del Plata.");
    } finally {
      setLoadingCalculation(false);
    }
  };

  const handleSolicitudEnviada = () => {
    setStep(1);
    setOrigen('');
    setDestino('');
    setDistancia(null);
    setPrecioCotizado(null);
    setOrigenCoords(null);
    setDestinoCoords(null);
    if (directionsRendererRef.current) directionsRendererRef.current.setDirections(null);
    if (marcadorOrigenRef.current) marcadorOrigenRef.current.setMap(null);
    if (marcadorDestinoRef.current) marcadorDestinoRef.current.setMap(null);
    if (mapInstanceRef.current) mapInstanceRef.current.setCenter(MAR_DEL_PLATA_CENTER);
  };

  if (loadingInitialData) {
    return (
        <>
            <PageHeader title="Solicitar Nuevo Envío" description="Calcule el costo de su envío y luego complete los detalles para la solicitud." />
            <div className="space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </>
    );
  }

  if (errorInitialData) {
    return (
      <>
        <PageHeader title="Solicitar Nuevo Envío" description="Calcule el costo de su envío y luego complete los detalles para la solicitud." />
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error al Cargar Configuración Inicial</AlertTitle>
          <AlertDescription>{errorInitialData}. Por favor, intente recargar la página o contacte al administrador.</AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader title={step === 1 ? "Paso 1: Calcular Envío" : "Paso 2: Completar Solicitud"} description={step === 1 ? "Ingrese origen y destino para cotizar." : "Complete los detalles de su envío."} />
      
      {step === 1 && (
        <Card className="w-full max-w-2xl mx-auto animate-in fade-in-50">
          <CardHeader>
            <CardTitle className="text-xl">Calcular Ruta y Precio Base</CardTitle>
            <CardDescription>Ingrese las direcciones de retiro y entrega para obtener una cotización.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="direccion-origen-solicitar" className="block text-sm font-medium mb-1">Dirección de Retiro</Label>
               <div className="flex items-center gap-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <MapPinIcon className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" />
                <Input id="direccion-origen-solicitar" type="text" value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Ej: Av. Colón 1234, Mar del Plata" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow p-3"/>
              </div>
            </div>
            <div>
              <Label htmlFor="direccion-destino-solicitar" className="block text-sm font-medium mb-1">Dirección de Entrega</Label>
              <div className="flex items-center gap-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <MapPinIcon className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" />
                <Input id="direccion-destino-solicitar" type="text" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ej: Av. Libertad 4567, Mar del Plata" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow p-3"/>
              </div>
            </div>
            <Button onClick={handleCalcularYContinuar} disabled={loadingCalculation || !GOOGLE_MAPS_API_KEY} className="w-full">
              {loadingCalculation ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Calculator className="mr-2 h-4 w-4" />}
              Calcular y Continuar Solicitud
            </Button>
            {errorCalculation && (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error de Cálculo</AlertTitle>
                <AlertDescription>{errorCalculation}</AlertDescription>
              </Alert>
            )}
            {!GOOGLE_MAPS_API_KEY && (
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Error de Configuración del Mapa</AlertTitle>
                    <AlertDescription>La funcionalidad de mapa no está disponible. Contacte al administrador.</AlertDescription>
                </Alert>
            )}
            {distancia && <p className="text-center text-sm text-muted-foreground">Distancia aproximada: {distancia}</p>}
            {precioCotizado !== null && <p className="text-center text-lg font-semibold">Precio cotizado base: ${precioCotizado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>}
            <div ref={mapRef} className="h-[250px] w-full rounded-md border bg-muted/30 mt-4">
              {!GOOGLE_MAPS_API_KEY && <div className="flex items-center justify-center h-full text-muted-foreground"><PackageSearch className="h-10 w-10 mr-2"/> Mapa no disponible.</div>}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && origen && destino && precioCotizado !== null && !loadingInitialData && !errorInitialData && (
        <div className="animate-in fade-in-50">
            <Button variant="outline" onClick={() => { setStep(1); setErrorCalculation(null); }} className="mb-4 flex items-center gap-2">
                <Edit className="h-4 w-4"/> Modificar Direcciones / Recalcular
            </Button>
            <SolicitarEnvioForm
                tiposPaquete={tiposPaqueteActivos}
                tiposServicio={tiposServicioActivos}
                createEnvioIndividualAction={createEnvioIndividualAction}
                initialData={{
                    direccion_retiro: origen,
                    latitud_retiro: origenCoords?.lat || null,
                    longitud_retiro: origenCoords?.lng || null,
                    direccion_entrega: destino,
                    latitud_entrega: destinoCoords?.lat || null,
                    longitud_entrega: destinoCoords?.lng || null,
                    precio_cotizado: precioCotizado,
                }}
                onSuccess={handleSolicitudEnviada}
                onBack={() => setStep(1)}
            />
        </div>
      )}
    </>
  );
}

    