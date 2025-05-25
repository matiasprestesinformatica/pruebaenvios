
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Info as InfoIcon, MapPinIcon, Rocket, Loader2, Calculator } from "lucide-react";
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TarifaDistanciaCalculadora } from '@/types/supabase';
import { SolicitudEnvioForm } from '@/components/calculadora/solicitud-envio-form';
import { createEnvioDesdeCalculadoraAction } from '@/app/calculadora/actions';
import { loadGoogleMapsApi } from '@/lib/google-maps-loader'; // Use shared loader

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.086l-.579 2.168 2.129-.565z" />
  </svg>
);

interface CaluloCotizadorExpressProps {
  tarifas: TarifaDistanciaCalculadora[];
}

const MAR_DEL_PLATA_CENTER = { lat: -38.0055, lng: -57.5426 };

const CaluloCotizadorExpress: React.FC<CaluloCotizadorExpressProps> = ({ tarifas }) => {
  const [origen, setOrigen] = useState<string>('');
  const [destino, setDestino] = useState<string>('');
  const [distancia, setDistancia] = useState<string | null>(null);
  const [precio, setPrecio] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleApiLoadedState, setGoogleApiLoadedState] = useState<boolean>(false);
  const [mapApiLoading, setMapApiLoading] = useState<boolean>(true); // Tracks script loading attempt
  const [error, setError] = useState<string | null>(null);
  const [showSolicitudForm, setShowSolicitudForm] = useState<boolean>(false);
  const [origenCoords, setOrigenCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<{ lat: number; lng: number } | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const marcadorOrigenRef = useRef<google.maps.Marker | null>(null);
  const marcadorDestinoRef = useRef<google.maps.Marker | null>(null);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps?.DirectionsService || !window.google?.maps?.DirectionsRenderer) {
      console.error("Map ref or Google Maps API not available for initMap in CotizadorExpress.");
      setError("No se pudo inicializar el mapa. Intente recargar.");
      return;
    }
    if (mapInstanceRef.current) return;

    const map = new window.google.maps.Map(mapRef.current!, {
      zoom: 12, center: MAR_DEL_PLATA_CENTER, mapTypeControl: false, streetViewControl: false, fullscreenControl: true, zoomControl: true,
    });
    mapInstanceRef.current = map;
    directionsServiceRef.current = new window.google.maps.DirectionsService();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({ map: map, suppressMarkers: true });
  }, []);

  useEffect(() => {
    loadGoogleMapsApi()
      .then(() => {
        setGoogleApiLoadedState(true);
        setError(null);
      })
      .catch((err: Error) => {
        console.error("Failed to load Google Maps API in CotizadorExpress:", err);
        setError(err.message || "Error al cargar el servicio de mapas.");
        setGoogleApiLoadedState(false);
      })
      .finally(() => {
        setMapApiLoading(false);
      });
  }, []);

  useEffect(() => {
    if (googleApiLoadedState && mapRef.current && !mapInstanceRef.current) {
      initMap();
    }
  }, [googleApiLoadedState, initMap]);


  const parsePrecioToNumber = (precioString: string | null): number | null => {
    if (!precioString) return null;
    const numericString = precioString.replace('$', '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? null : parsed;
  };

  const calcularPrecioConTarifas = (distanciaKm: number) => {
    if (!tarifas || tarifas.length === 0) return "Tarifas no disponibles. Consulte por WhatsApp.";
    for (const tarifa of tarifas) {
      if (distanciaKm <= tarifa.distancia_hasta_km) {
        return `$${tarifa.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
    const lastTier = tarifas[tarifas.length - 1];
    if (lastTier && distanciaKm > lastTier.distancia_hasta_km && lastTier.distancia_hasta_km === 10.0 && tarifas.find(t => t.tipo_calculadora === 'express')) { 
        const kmExtra = Math.ceil(distanciaKm - 10);
        const precioCalculado = lastTier.precio + (kmExtra * 750);
        return `$${precioCalculado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return "Distancia excede tarifas o requiere cálculo especial. Consulte por WhatsApp.";
  };

  const colocarMarcadores = useCallback((origenPos: google.maps.LatLng, destinoPos: google.maps.LatLng, origenDir: string, destinoDir: string) => {
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
  }, []);

  const calcularRuta = async () => {
    if (!origen || !destino) { setError("Por favor, ingrese tanto la dirección de origen como la de destino."); setShowSolicitudForm(false); return; }
    if (mapApiLoading || !googleApiLoadedState || !directionsServiceRef.current || !directionsRendererRef.current ) { 
        setError("El servicio de mapas no está listo. Intente de nuevo o recargue la página."); setShowSolicitudForm(false); return; 
    }
    setLoading(true); setError(null); setDistancia(null); setPrecio(null); setShowSolicitudForm(false);
    setOrigenCoords(null); setDestinoCoords(null); 

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
        const precioCalculado = calcularPrecioConTarifas(distanciaValorKm);
        setDistancia(`${distanciaTexto}`);
        setPrecio(precioCalculado);

        if (leg.start_location) {
            setOrigenCoords({ lat: leg.start_location.lat(), lng: leg.start_location.lng() });
        }
        if (leg.end_location) {
            setDestinoCoords({ lat: leg.end_location.lat(), lng: leg.end_location.lng() });
        }

        if (parsePrecioToNumber(precioCalculado) !== null) {
            setShowSolicitudForm(true);
        }
        if (leg.start_location && leg.end_location && leg.start_address && leg.end_address) {
          colocarMarcadores(leg.start_location, leg.end_location, leg.start_address, leg.end_address);
        }
      } else { throw new Error("No se pudo obtener la información de la ruta."); }
    } catch (e) {
      console.error("Error al calcular la ruta:", e);
      setError("No se pudo calcular la ruta. Asegúrese de que las direcciones sean válidas en Mar del Plata.");
      setShowSolicitudForm(false);
    } finally { setLoading(false); }
  };
  
  const handleSolicitudSuccess = () => {
    setShowSolicitudForm(false);
    setOrigen('');
    setDestino('');
    setDistancia(null);
    setPrecio(null);
    setOrigenCoords(null);
    setDestinoCoords(null);
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections(null); 
    }
    if (marcadorOrigenRef.current) marcadorOrigenRef.current.setMap(null);
    if (marcadorDestinoRef.current) marcadorDestinoRef.current.setMap(null);
    if (mapInstanceRef.current) mapInstanceRef.current.setCenter(MAR_DEL_PLATA_CENTER);

  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8 bg-card shadow-xl rounded-lg animate-fade-in">
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-semibold text-primary flex items-center justify-center">
          <Rocket className="mr-2 h-6 w-6 text-accent" /> Cotizador de Envíos Express
        </h3>
        <p className="text-muted-foreground mt-1">
          Calculá el costo de tu envío express. Ingresá las direcciones para una cotización instantánea.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6 animate-fade-in">
        <TooltipProvider>
          <div>
            <Label htmlFor="direccion-origen-express" className="block text-sm font-medium text-foreground mb-1">Dirección de Origen <Tooltip><TooltipTrigger asChild><InfoIcon className="inline-block ml-1 h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent><p>Ingresa la calle y altura donde se retira el paquete.</p></TooltipContent></Tooltip></Label>
            <div className="flex items-center gap-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <MapPinIcon className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" /><Input id="direccion-origen-express" type="text" value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Ej: Av. Colón 2000" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow p-3"/>
            </div>
          </div>
          <div>
            <Label htmlFor="direccion-destino-express" className="block text-sm font-medium text-foreground mb-1">Dirección de Destino <Tooltip><TooltipTrigger asChild><InfoIcon className="inline-block ml-1 h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent><p>Ingresa la calle y altura donde se entrega el paquete.</p></TooltipContent></Tooltip></Label>
            <div className="flex items-center gap-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <MapPinIcon className="h-5 w-5 text-muted-foreground ml-3 flex-shrink-0" /><Input id="direccion-destino-express" type="text" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ej: Juan B. Justo 1500" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow p-3"/>
            </div>
          </div>
          </TooltipProvider>
          <Button onClick={calcularRuta} disabled={loading || mapApiLoading || !googleApiLoadedState} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-3 text-base font-semibold transition-transform hover:scale-105 duration-200">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
            Calcular Ruta y Precio Express
          </Button>
          {mapApiLoading && !googleApiLoadedState && <p className="text-sm text-center text-muted-foreground">Cargando servicio de mapas...</p>}
          {error && ( <Alert variant="destructive" className="animate-fade-in"><Terminal className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> )}
          <div className="space-y-2 text-foreground/80 animate-fade-in animation-delay-200">
            {distancia && <p id="distancia-express" className="text-lg">Distancia: <span className="font-semibold text-primary">{distancia}</span></p>}
            {precio && <p id="precio-express" className="text-lg">Precio Express estimado: <span className="font-semibold text-primary">{precio}</span></p>}
          </div>
          <Alert className="mt-6 animate-fade-in animation-delay-400"><InfoIcon className="h-5 w-5 text-secondary" /><AlertTitle className="text-secondary font-semibold">Importante</AlertTitle><AlertDescription className="text-sm text-foreground/70">Los valores son aproximados. Pueden existir adicionales (Distancia retiro, bulto, demora, lluvia, etc). Para un valor exacto, comunícate por WhatsApp.</AlertDescription></Alert>
          <div className="mt-4 text-center animate-fade-in animation-delay-400">
            <Button asChild variant="outline" className="border-green-600 text-green-700 hover:bg-green-50 hover:text-green-700 shadow-sm">
              <Link href="https://wa.me/+542236602699?text=Hola!%20Quisiera%20una%20cotización%20exacta%20para%20mi%20envío%20Express." target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <WhatsAppIcon className="h-5 w-5"/> <span>WhatsApp para cotización exacta: 223-660-2699</span>
              </Link>
            </Button>
          </div>
          <p className="text-center mt-8 text-sm text-foreground/70">
            Para envíos más económicos, utilizá nuestro <Link href="/cotizador-envios-lowcost" className="text-secondary underline hover:text-secondary/80">Cotizador Low Cost</Link>.
          </p>
        </div>
        <div className="relative animate-fade-in h-full"> 
          {(mapApiLoading && !googleApiLoadedState) && <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-md"><p className="text-foreground">Cargando mapa...</p></div>}
          <div ref={mapRef} id="mapa-express" className="h-[400px] md:h-full w-full rounded-md shadow-md border border-border min-h-[300px]"></div>
        </div>
      </div>
      {showSolicitudForm && precio && origen && destino && (
        <div className="mt-10 animate-fade-in">
          <SolicitudEnvioForm
            initialData={{
              direccionRetiro: origen,
              direccionEntrega: destino,
              montoACobrar: parsePrecioToNumber(precio) ?? 0,
            }}
            initialDestinoCoords={destinoCoords} 
            createEnvioAction={createEnvioDesdeCalculadoraAction}
            onSolicitudSuccess={handleSolicitudSuccess}
          />
        </div>
      )}
    </div>
  );
};

export default CaluloCotizadorExpress;
