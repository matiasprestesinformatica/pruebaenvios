
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { SolicitarEnvioForm } from "@/components/solicitar-envio-form";
import { getTiposPaqueteActivosAction, getTiposServicioActivosAction } from "@/app/configuracion/actions";
import { getTarifasCalculadoraAction, createEnvioIndividualAction } from "./actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Terminal, Info, MapPinIcon, Loader2, ArrowRight, Edit, Calculator } from "lucide-react";
import type { TipoPaquete, TipoServicio, TarifaDistanciaCalculadora, Cliente, EnvioIndividual, NuevoEnvioIndividual } from "@/types/supabase"; // Added missing types
import type { SolicitudEnvioIndividualFormData } from '@/lib/schemas';

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-api-script-solicitar";

export default function SolicitarEnviosPage() {
  const [step, setStep] = useState(1); // 1: Addresses, 2: Full Form

  // Step 1 state
  const [origen, setOrigen] = useState<string>('');
  const [destino, setDestino] = useState<string>('');
  const [distancia, setDistancia] = useState<string | null>(null);
  const [precioCotizado, setPrecioCotizado] = useState<number | null>(null);
  const [precioCotizadoDisplay, setPrecioCotizadoDisplay] = useState<string | null>(null);
  const [origenCoords, setOrigenCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingCalculation, setLoadingCalculation] = useState<boolean>(false);
  const [errorCalculation, setErrorCalculation] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState<boolean>(true);

  // Data for Step 2 form
  const [tiposPaquete, setTiposPaquete] = useState<Pick<TipoPaquete, 'id' | 'nombre'>[]>([]);
  const [tiposServicio, setTiposServicio] = useState<Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[]>([]);
  const [tarifasExpress, setTarifasExpress] = useState<TarifaDistanciaCalculadora[]>([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const initMap = useCallback(() => {
    if (!window.google || !window.google.maps || !mapRef.current || mapInstanceRef.current) {
      setMapLoading(false);
      return;
    }
    const marDelPlata = { lat: -38.0055, lng: -57.5426 };
    const map = new window.google.maps.Map(mapRef.current!, {
      zoom: 12, center: marDelPlata, mapTypeControl: false, streetViewControl: false,
    });
    mapInstanceRef.current = map;
    directionsServiceRef.current = new window.google.maps.DirectionsService();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({ map });
    setMapLoading(false);
  }, []);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID) || window.google?.maps) {
        if (window.google?.maps && !mapInstanceRef.current) initMap();
        else if (mapInstanceRef.current) setMapLoading(false);
        else {
          const checkGoogle = setInterval(() => {
            if (window.google?.maps) { clearInterval(checkGoogle); initMap(); }
          }, 100);
        }
        return;
      }
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) { setErrorCalculation("Falta la configuración del mapa. Contacta al administrador."); setMapLoading(false); return; }
      (window as any).initMapForSolicitarEnvio = initMap;
      const script = document.createElement('script');
      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMapForSolicitarEnvio&libraries=marker,geometry,directions`;
      script.async = true; script.defer = true;
      script.onerror = () => { setErrorCalculation("Error al cargar el script del mapa."); setMapLoading(false); };
      document.head.appendChild(script);
    };

    if (typeof window !== 'undefined') {
        loadGoogleMapsScript();
    }

    const fetchInitialData = async () => {
      setLoadingInitialData(true);
      try {
        const [paquetesResult, serviciosResult, tarifasResult] = await Promise.all([
          getTiposPaqueteActivosAction(),
          getTiposServicioActivosAction(),
          getTarifasCalculadoraAction('express') // Default to express for initial quote
        ]);
        setTiposPaquete(paquetesResult);
        setTiposServicio(serviciosResult);
        if (tarifasResult.data) {
          setTarifasExpress(tarifasResult.data);
        } else {
          setErrorCalculation(tarifasResult.error || "No se pudieron cargar las tarifas para cotizar.");
        }
      } catch (error) {
        console.error("Error fetching initial data for SolicitarEnvioPage:", error);
        setErrorCalculation("No se pudieron cargar los datos necesarios para el formulario. Intente más tarde.");
      }
      setLoadingInitialData(false);
    };
    fetchInitialData();
    
    return () => { if ((window as any).initMapForSolicitarEnvio) delete (window as any).initMapForSolicitarEnvio; };
  }, [initMap]);

  const calcularPrecioConTarifas = (distanciaKm: number) => {
    if (!tarifasExpress || tarifasExpress.length === 0) {
      return { precio: null, displayText: "Tarifas no disponibles." };
    }
    for (const tarifa of tarifasExpress) {
      if (distanciaKm <= tarifa.distancia_hasta_km) {
        return { 
            precio: tarifa.precio, 
            displayText: `$${tarifa.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
        };
      }
    }
    // Handle express logic for > 10km as in CaluloCotizadorExpress
    const lastTier = tarifasExpress[tarifasExpress.length - 1];
    if (lastTier && distanciaKm > lastTier.distancia_hasta_km && lastTier.distancia_hasta_km === 10.0 && tarifasExpress.find(t => t.tipo_calculadora === 'express')) { 
        const kmExtra = Math.ceil(distanciaKm - 10);
        const precioCalculadoNum = lastTier.precio + (kmExtra * 750); // Assuming 750 per km extra
        return { 
            precio: precioCalculadoNum, 
            displayText: `$${precioCalculadoNum.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        };
    }
    return { precio: null, displayText: "Consulte por WhatsApp." };
  };

  const handleCalcularYContinuar = async () => {
    if (!origen || !destino) { setErrorCalculation("Por favor, ingrese ambas direcciones."); return; }
    if (!directionsServiceRef.current || !directionsRendererRef.current || !window.google?.maps) {
      setErrorCalculation("El servicio de mapas no está listo. Intente de nuevo."); return;
    }
    setLoadingCalculation(true); setErrorCalculation(null); setDistancia(null); setPrecioCotizado(null); setPrecioCotizadoDisplay(null);
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
        const { precio, displayText } = calcularPrecioConTarifas(distanciaValorKm);
        
        setDistancia(distanciaTexto);
        setPrecioCotizado(precio);
        setPrecioCotizadoDisplay(displayText);

        if (leg.start_location) setOrigenCoords({ lat: leg.start_location.lat(), lng: leg.start_location.lng() });
        if (leg.end_location) setDestinoCoords({ lat: leg.end_location.lat(), lng: leg.end_location.lng() });

        if (precio !== null) {
          setStep(2);
        } else {
          setErrorCalculation("No se pudo calcular un precio para esta ruta. " + displayText);
        }
      } else { throw new Error("No se pudo obtener la información de la ruta."); }
    } catch (e) {
      console.error("Error al calcular la ruta:", e);
      setErrorCalculation("No se pudo calcular la ruta. Asegúrese de que las direcciones sean válidas en Mar del Plata.");
    } finally { setLoadingCalculation(false); }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    // Optionally clear form fields from step 2 if needed, or let SolicitarEnvioForm reset itself.
  };

  if (loadingInitialData) {
    return (
      <>
        <PageHeader title="Solicitar Nuevo Envío" description="Cargando configuración del formulario..." />
        <SolicitarEnvioFormSkeleton isInitialSetup={true} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Solicitar Nuevo Envío"
        description={step === 1 ? "Ingrese las direcciones de retiro y entrega para obtener una cotización inicial." : "Complete los detalles de su envío."}
      />
      
      {step === 1 && (
        <TooltipProvider>
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" />Paso 1: Direcciones y Cotización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="direccion-retiro-solicitar" className="block text-sm font-medium text-foreground mb-1">
                Dirección de Retiro <Tooltip><TooltipTrigger asChild><Info className="inline-block ml-1 h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent><p>Calle y altura donde se retira.</p></TooltipContent></Tooltip>
              </Label>
              <div className="flex items-center gap-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <MapPinIcon className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" />
                <Input id="direccion-retiro-solicitar" type="text" value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Ej: Av. Colón 1234" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow p-3"/>
              </div>
            </div>
            <div>
              <Label htmlFor="direccion-entrega-solicitar" className="block text-sm font-medium text-foreground mb-1">
                Dirección de Entrega <Tooltip><TooltipTrigger asChild><Info className="inline-block ml-1 h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent><p>Calle y altura donde se entrega.</p></TooltipContent></Tooltip>
              </Label>
              <div className="flex items-center gap-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <MapPinIcon className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" />
                  <Input id="direccion-entrega-solicitar" type="text" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ej: Juan B. Justo 1500" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow p-3"/>
              </div>
            </div>
            <Button onClick={handleCalcularYContinuar} disabled={loadingCalculation || mapLoading || tarifasExpress.length === 0} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-3 text-base">
              {loadingCalculation ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4"/>}
              Calcular y Continuar Solicitud
            </Button>
            {errorCalculation && (<Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{errorCalculation}</AlertDescription></Alert>)}
            {distancia && <p className="text-sm">Distancia estimada: <span className="font-semibold">{distancia}</span></p>}
            {precioCotizadoDisplay && <p className="text-sm">Precio cotizado (Express): <span className="font-semibold">{precioCotizadoDisplay}</span></p>}
            <div ref={mapRef} id="mapa-solicitar" className="h-[200px] w-full rounded-md border mt-4">
                {mapLoading && <div className="flex items-center justify-center h-full bg-muted/50"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
            </div>
          </CardContent>
        </Card>
        </TooltipProvider>
      )}

      {step === 2 && origen && destino && precioCotizado !== null && (
        <SolicitarEnvioForm
          tiposPaquete={tiposPaquete}
          tiposServicio={tiposServicio}
          createEnvioIndividualAction={createEnvioIndividualAction}
          initialData={{
            direccion_retiro: origen,
            direccion_entrega: destino,
            precio_cotizado: precioCotizado,
            latitud_retiro: origenCoords?.lat || null,
            longitud_retiro: origenCoords?.lng || null,
            latitud_entrega: destinoCoords?.lat || null,
            longitud_entrega: destinoCoords?.lng || null,
          }}
          onBack={handleBackToStep1}
          onSuccess={() => {
            setStep(1); 
            setOrigen(''); setDestino(''); setDistancia(null); setPrecioCotizado(null); setPrecioCotizadoDisplay(null);
            setOrigenCoords(null); setDestinoCoords(null);
            if(directionsRendererRef.current) directionsRendererRef.current.setDirections({routes: []});
          }}
        />
      )}
    </>
  );
}

function SolicitarEnvioFormSkeleton({ isInitialSetup }: { isInitialSetup?: boolean }) {
  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6 lg:p-8 bg-card shadow-xl rounded-lg space-y-6">
      {isInitialSetup && (
        <>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
        </>
      )}
      {!isInitialSetup && (
        <>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <hr className="my-4"/>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <hr className="my-4"/>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full mt-4" />
        </>
      )}
    </div>
  );
}

// Ensure window.initMapForSolicitarEnvio is globally accessible if needed
declare global { interface Window { initMapForSolicitarEnvio?: () => void; } }
