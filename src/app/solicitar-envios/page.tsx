
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { SolicitarEnvioForm } from "@/components/solicitar-envio-form";
import { getTarifasCalculadoraAction } from "@/app/calculadora/actions";
import { getTiposPaqueteActivosAction, getTiposServicioActivosAction } from "@/app/configuracion/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, MapPinIcon, Calculator, Loader2, Edit, InfoIcon } from "lucide-react";
import type { TarifaDistanciaCalculadora, TipoPaquete, TipoServicio } from "@/types/supabase";
import { loadGoogleMapsApi } from '@/lib/google-maps-loader'; // Using shared loader
import { createEnvioIndividualAction } from './actions'; // Local action

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAR_DEL_PLATA_CENTER = { lat: -38.0055, lng: -57.5426 };
const INITIAL_ZOOM = 12;

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.086l-.579 2.168 2.129-.565z" />
  </svg>
);

export default function SolicitarEnviosPage() {
  const [step, setStep] = useState(1);
  const [origen, setOrigen] = useState<string>('');
  const [destino, setDestino] = useState<string>('');
  const [distancia, setDistancia] = useState<string | null>(null);
  const [precioCotizado, setPrecioCotizado] = useState<number | null>(null);
  
  const [origenCoords, setOrigenCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [googleApiLoadedState, setGoogleApiLoadedState] = useState<boolean>(false);
  const [mapApiLoading, setMapApiLoading] = useState<boolean>(true);
  const [loadingCalculation, setLoadingCalculation] = useState<boolean>(false);
  const [errorCalculation, setErrorCalculation] = useState<string | null>(null);

  const [loadingInitialData, setLoadingInitialData] = useState<boolean>(true);
  const [errorInitialData, setErrorInitialData] = useState<string | null>(null);
  const [tarifasExpress, setTarifasExpress] = useState<TarifaDistanciaCalculadora[]>([]);
  const [tiposPaqueteActivos, setTiposPaqueteActivos] = useState<Pick<TipoPaquete, 'id' | 'nombre'>[]>([]);
  const [tiposServicioActivos, setTiposServicioActivos] = useState<Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[]>([]);
  
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const marcadorOrigenRef = useRef<google.maps.Marker | null>(null);
  const marcadorDestinoRef = useRef<google.maps.Marker | null>(null);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps?.Map || !window.google?.maps?.DirectionsService || !window.google?.maps?.DirectionsRenderer) {
      console.error("SolicitarEnviosPage: initMap called but mapRef or Google Maps core services not available.");
      setErrorCalculation("No se pudo inicializar el mapa correctamente. Intente recargar.");
      return;
    }
    if (mapInstanceRef.current) return; // Prevent re-initialization

    try {
      const map = new window.google.maps.Map(mapRef.current!, {
        zoom: INITIAL_ZOOM, center: MAR_DEL_PLATA_CENTER, mapTypeControl: false, streetViewControl: false,
      });
      mapInstanceRef.current = map;
      directionsServiceRef.current = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({ map: map, suppressMarkers: true });
      setErrorCalculation(null); // Clear any previous map init error
    } catch (error) {
      console.error("Error initializing Google Maps instance in SolicitarEnviosPage:", error);
      setErrorCalculation("Error al inicializar la instancia del mapa.");
    }
  }, [setErrorCalculation]); // Added setErrorCalculation to dependencies

  useEffect(() => {
    loadGoogleMapsApi()
      .then(() => {
        setGoogleApiLoadedState(true);
        setMapApiLoading(false);
      })
      .catch((err: Error) => {
        console.error("Failed to load Google Maps API in SolicitarEnviosPage:", err);
        setErrorCalculation(err.message || "Error al cargar el servicio de mapas. Verifique la API Key y la conexión.");
        setGoogleApiLoadedState(false);
        setMapApiLoading(false);
      });
  }, []);
  
  useEffect(() => {
    if (googleApiLoadedState && step === 1 && mapRef.current && !mapInstanceRef.current) {
      initMap();
    }
  }, [googleApiLoadedState, step, initMap]);

  useEffect(() => {
    async function fetchInitialDataForForm() {
      setLoadingInitialData(true);
      setErrorInitialData(null);
      try {
        const [tarifasResult, paquetesResult, serviciosResult] = await Promise.all([
          getTarifasCalculadoraAction('express'),
          getTiposPaqueteActivosAction(),
          getTiposServicioActivosAction(),
        ]);

        if (tarifasResult.error || !tarifasResult.data || tarifasResult.data.length === 0) {
           const msg = tarifasResult.error || "No se encontraron tarifas Express para cotizar.";
           console.warn("Tarifas Express:", msg);
           setErrorInitialData(prev => prev ? `${prev} ${msg}` : msg);
           setTarifasExpress([]);
        } else {
            setTarifasExpress(tarifasResult.data);
        }

        if (!paquetesResult || paquetesResult.length === 0) console.warn("No se encontraron tipos de paquete activos.");
        setTiposPaqueteActivos(paquetesResult || []);
        
        if(!serviciosResult || serviciosResult.length === 0) console.warn("No se encontraron tipos de servicio activos.");
        setTiposServicioActivos(serviciosResult || []);

      } catch (err) {
        const error = err as Error;
        console.error("Error fetching initial data for SolicitarEnviosPage:", error);
        setErrorInitialData(prev => prev ? `${prev} ${error.message}` : error.message || "Error al cargar datos de configuración para la solicitud.");
      } finally {
        setLoadingInitialData(false);
      }
    }
    fetchInitialDataForForm();
  }, []);

  const calcularPrecioConTarifas = useCallback((distanciaKm: number): number | null => {
    if (!tarifasExpress || tarifasExpress.length === 0) {
        setErrorCalculation("Tarifas Express no disponibles. No se puede calcular el precio. Por favor, configure las tarifas e intente de nuevo.");
        return null;
    }
    for (const tarifa of tarifasExpress) {
      if (distanciaKm <= tarifa.distancia_hasta_km) {
        return tarifa.precio;
      }
    }
    // Handle cases beyond defined tiers - this might need adjustment based on business rules
    // For now, if it exceeds all, it implies consultation
    setErrorCalculation("Distancia excede rangos tarifarios. Consulte por WhatsApp para un precio personalizado.");
    return null; 
  }, [tarifasExpress]);

  const colocarMarcadores = useCallback((
    origenPos: google.maps.LatLng,
    destinoPos: google.maps.LatLng,
    origenDir: string,
    destinoDir: string
  ) => {
    if (!window.google?.maps?.Marker || !mapInstanceRef.current) return;
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
  }, []);

  const handleCalcularYContinuar = async () => {
    if (!origen || !destino) { setErrorCalculation("Por favor, ingrese ambas direcciones."); return; }
    if (mapApiLoading || !googleApiLoadedState || !directionsServiceRef.current || !directionsRendererRef.current ) {
      setErrorCalculation("El servicio de mapas no está listo. Intente de nuevo o recargue la página."); return;
    }
    if (tarifasExpress.length === 0 && !errorInitialData) {
        setErrorCalculation("Las tarifas para cotizar no están cargadas. Intente recargar la página o configure las tarifas."); return;
    }
    setLoadingCalculation(true); setErrorCalculation(null); setDistancia(null); setPrecioCotizado(null);
    setOrigenCoords(null); setDestinoCoords(null); 

    try {
      const response = await directionsServiceRef.current.route({
        origin: `${origen}, Mar del Plata, Argentina`,
        destination: `${destino}, Mar del Plata, Argentina`,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      if (directionsRendererRef.current) directionsRendererRef.current.setDirections(response);
      const route = response.routes[0];
      if (route?.legs?.[0]) {
        const leg = route.legs[0];
        const distanciaTexto = leg.distance?.text || "N/A";
        const distanciaValorKm = (leg.distance?.value || 0) / 1000;
        const precioCalc = calcularPrecioConTarifas(distanciaValorKm);
        setDistancia(distanciaTexto); setPrecioCotizado(precioCalc);
        
        if (leg.start_location) setOrigenCoords({ lat: leg.start_location.lat(), lng: leg.start_location.lng() });
        if (leg.end_location) setDestinoCoords({ lat: leg.end_location.lat(), lng: leg.end_location.lng() });
        
        if (precioCalc !== null) {
          setStep(2); 
        } else if (!errorCalculation) { 
            setErrorCalculation("No se pudo calcular un precio para la distancia. Verifique las tarifas o la distancia.");
        }
        
        if (leg.start_location && leg.end_location && leg.start_address && leg.end_address) {
            colocarMarcadores(leg.start_location, leg.end_location, leg.start_address, leg.end_address);
        }
      } else { throw new Error("No se pudo obtener la información de la ruta desde Google Maps."); }
    } catch (e) {
      console.error("Error al calcular la ruta:", e);
      setErrorCalculation(`No se pudo calcular la ruta. Asegúrese de que las direcciones sean válidas en Mar del Plata. Error: ${(e as Error).message}`);
    } finally { setLoadingCalculation(false); }
  };

  const handleSolicitudEnviada = () => {
    setStep(1); setOrigen(''); setDestino(''); setDistancia(null); setPrecioCotizado(null);
    // No es necesario limpiar origenCoords y destinoCoords aquí si se pasan al form y este no los modifica.
    // setOrigenCoords(null); setDestinoCoords(null); 
    if (directionsRendererRef.current) directionsRendererRef.current.setDirections(null as any); // Corrected way to clear
    if (marcadorOrigenRef.current) marcadorOrigenRef.current.setMap(null);
    if (marcadorDestinoRef.current) marcadorDestinoRef.current.setMap(null);
    if (mapInstanceRef.current) { mapInstanceRef.current.setCenter(MAR_DEL_PLATA_CENTER); mapInstanceRef.current.setZoom(INITIAL_ZOOM); }
    setErrorCalculation(null);
  };
  
  const handleModificarDirecciones = () => {
    setStep(1);
    setErrorCalculation(null);
  };

  if (loadingInitialData) {
    return (
        <>
            <PageHeader title="Solicitar Nuevo Envío" description="Calcule el costo de su envío y luego complete los detalles para la solicitud." />
            <div className="space-y-6 mt-4">
                <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" /> <Skeleton className="h-12 w-full mt-2" />
                <Skeleton className="h-64 w-full mt-4 rounded-md" />
            </div>
        </>
    );
  }
  if (errorInitialData) {
    return (
      <>
        <PageHeader title="Solicitar Nuevo Envío" description="Calcule el costo de su envío y luego complete los detalles para la solicitud." />
        <Alert variant="destructive" className="mt-4">
          <Terminal className="h-4 w-4" /> <AlertTitle>Error al Cargar Configuración Inicial</AlertTitle>
          <AlertDescription>{errorInitialData}. Por favor, intente recargar la página o contacte al administrador.</AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title={step === 1 ? "Paso 1: Calcular Envío" : "Paso 2: Completar Solicitud de Envío"} 
        description={step === 1 ? "Ingrese las direcciones de retiro y entrega para obtener una cotización base." : "Complete los detalles de su envío. Las direcciones y el precio base se han pre-cargado."} 
      />
      
      {step === 1 && (
        <Card className="w-full max-w-2xl mx-auto animate-in fade-in-50 mt-4">
          <CardHeader>
            <CardTitle className="text-xl">Calcular Ruta y Precio Base</CardTitle>
            <CardDescription>Las direcciones deben ser dentro de Mar del Plata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="direccion-retiro-solicitar" className="block text-sm font-medium mb-1">Dirección de Retiro</Label>
               <div className="flex items-center gap-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <MapPinIcon className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" />
                <Input id="direccion-retiro-solicitar" type="text" value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Ej: Av. Colón 1234, Mar del Plata" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow p-3"/>
              </div>
            </div>
            <div>
              <Label htmlFor="direccion-entrega-solicitar" className="block text-sm font-medium mb-1">Dirección de Entrega</Label>
              <div className="flex items-center gap-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <MapPinIcon className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" />
                <Input id="direccion-entrega-solicitar" type="text" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ej: Av. Libertad 4567, Mar del Plata" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow p-3"/>
              </div>
            </div>
            <Button 
                onClick={handleCalcularYContinuar} 
                disabled={loadingCalculation || mapApiLoading || !googleApiLoadedState || tarifasExpress.length === 0 || loadingInitialData || !directionsServiceRef.current} 
                className="w-full"
            >
              {loadingCalculation ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Calculator className="mr-2 h-4 w-4" />}
              Calcular y Continuar Solicitud
            </Button>
            {(mapApiLoading && !googleApiLoadedState && !errorCalculation) && <p className="text-sm text-center text-muted-foreground">Cargando servicio de mapas...</p>}
            {errorCalculation && (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" /> <AlertTitle>Error de Cálculo</AlertTitle>
                <AlertDescription>{errorCalculation}</AlertDescription>
              </Alert>
            )}
             <div ref={mapRef} className="h-[250px] w-full rounded-md border bg-muted/30 mt-4">
              {(mapApiLoading && !googleApiLoadedState) && !errorCalculation && GOOGLE_MAPS_API_KEY && <div className="flex items-center justify-center h-full text-muted-foreground"><Loader2 className="h-6 w-6 mr-2 animate-spin"/>Cargando mapa...</div>}
              {errorCalculation && googleApiLoadedState && <div className="flex items-center justify-center h-full text-destructive"><Terminal className="h-6 w-6 mr-2"/>Error al calcular ruta en mapa.</div>}
              {!GOOGLE_MAPS_API_KEY && <div className="flex items-center justify-center h-full text-destructive"><Terminal className="h-6 w-6 mr-2"/>API Key de Mapa no configurada.</div>}
            </div>
            {distancia && <p className="text-center text-sm text-muted-foreground mt-2">Distancia aproximada: {distancia}</p>}
            {precioCotizado !== null && <p className="text-center text-lg font-semibold mt-1">Precio cotizado base: ${precioCotizado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>}
          </CardContent>
        </Card>
      )}

      {step === 2 && origen && destino && precioCotizado !== null && !loadingInitialData && !errorInitialData && tiposPaqueteActivos.length > 0 && tiposServicioActivos.length > 0 && (
        <div className="animate-in fade-in-50 mt-6">
            <Button variant="outline" onClick={handleModificarDirecciones} className="mb-4 flex items-center gap-2">
                <Edit className="h-4 w-4"/> Modificar Direcciones
            </Button>
            <SolicitarEnvioForm
                tiposPaquete={tiposPaqueteActivos}
                tiposServicio={tiposServicioActivos}
                createEnvioIndividualAction={createEnvioIndividualAction}
                initialDireccionRetiro={origen}
                initialLatitudRetiro={origenCoords?.lat || null}
                initialLongitudRetiro={origenCoords?.lng || null}
                initialDireccionEntrega={destino}
                initialLatitudEntrega={destinoCoords?.lat || null}
                initialLongitudEntrega={destinoCoords?.lng || null}
                initialPrecioCotizado={precioCotizado}
                onSuccess={handleSolicitudEnviada}
                onBack={handleModificarDirecciones}
            />
        </div>
      )}
      {step === 2 && (loadingInitialData || errorInitialData || tiposPaqueteActivos.length === 0 || tiposServicioActivos.length === 0) && !errorCalculation && (
        <div className="mt-6 text-center">
            {loadingInitialData && <p><Loader2 className="h-5 w-5 animate-spin inline mr-2"/>Cargando datos del formulario...</p>}
            {errorInitialData && !loadingInitialData && <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{errorInitialData}</AlertDescription></Alert>}
            {(!loadingInitialData && !errorInitialData) && (tiposPaqueteActivos.length === 0 || tiposServicioActivos.length === 0) &&
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" /> <AlertTitle>Faltan Datos de Configuración</AlertTitle>
                <AlertDescription>No se pudieron cargar los tipos de paquete o servicio necesarios. Por favor, configurelos e intente nuevamente.</AlertDescription>
              </Alert>
            }
        </div>
      )}
    </>
  );
}

