
"use client";

import React, { useEffect, useRef, useState } from 'react';
import type { EnvioMapa } from '@/types/supabase';
import { estadoEnvioEnum } from '@/lib/schemas';
import { Loader2, AlertTriangle, Info } from 'lucide-react';

interface MapaEnviosViewProps {
  envios: EnvioMapa[];
}

const MAR_DEL_PLATA_CENTER = { lat: -38.0055, lng: -57.5426 }; // Approximate center of Mar del Plata
const INITIAL_ZOOM = 13;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function getEnvioMarkerColorHex(status: string | null): string {
  if (!status) return '#A9A9A9'; // DarkGray for unknown
  switch (status) {
    case estadoEnvioEnum.Values.pending: return '#FF0000'; // Red
    case estadoEnvioEnum.Values.suggested: return '#800080'; // Purple
    case estadoEnvioEnum.Values.asignado_a_reparto: return '#0000FF'; // Blue
    case estadoEnvioEnum.Values.en_transito: return '#FFA500'; // Orange
    case estadoEnvioEnum.Values.entregado: return '#008000'; // Green
    case estadoEnvioEnum.Values.cancelado: return '#696969'; // DimGray
    case estadoEnvioEnum.Values.problema_entrega: return '#FF69B4'; // HotPink
    default: return '#A9A9A9'; // DarkGray
  }
}

// Global variable to ensure the script is loaded only once
let mapsApiLoaded = false;
const mapsApiLoadingPromise: Promise<void> | null = null;


export function MapaEnviosView({ envios }: MapaEnviosViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [errorLoadingApi, setErrorLoadingApi] = useState<string | null>(null);
   const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check online status on mount and listen for changes
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);


  useEffect(() => {
    if (!isOnline) {
      setErrorLoadingApi("No hay conexión a internet para cargar el mapa.");
      setIsLoadingApi(false);
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      setErrorLoadingApi("La clave API de Google Maps no está configurada. El mapa no se puede cargar.");
      setIsLoadingApi(false);
      return;
    }

    if (mapsApiLoaded) {
      setIsLoadingApi(false);
      return;
    }

    if (mapsApiLoadingPromise) {
      mapsApiLoadingPromise.then(() => {
        setIsLoadingApi(false);
      }).catch(err => {
        console.error("Error in existing API loading promise:", err);
        setErrorLoadingApi("Error al cargar el script de Google Maps (promesa existente).");
        setIsLoadingApi(false);
      });
      return;
    }
    
    // Assign to a new const to ensure it's only set once within this scope
    const currentLoadingPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          mapsApiLoaded = true;
          setIsLoadingApi(false);
          resolve();
        };
        script.onerror = (err) => {
          console.error("Error loading Google Maps API script:", err);
          setErrorLoadingApi("No se pudo cargar el script de Google Maps. Verifique la clave API y la conexión.");
          setIsLoadingApi(false);
          reject(err);
        };
        document.head.appendChild(script);
    });
    // Assign the promise to the global-like variable
    (globalThis as any).mapsApiLoadingPromise = currentLoadingPromise;


  }, [isOnline]);

  useEffect(() => {
    if (!isLoadingApi && !errorLoadingApi && mapRef.current && !map) {
      const newMap = new google.maps.Map(mapRef.current, {
        center: MAR_DEL_PLATA_CENTER,
        zoom: INITIAL_ZOOM,
        mapTypeControl: false,
        streetViewControl: false,
      });
      setMap(newMap);
      setInfoWindow(new google.maps.InfoWindow());
    }
  }, [isLoadingApi, errorLoadingApi, map]);

  useEffect(() => {
    if (map && infoWindow && envios) {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      const newMarkers: google.maps.Marker[] = [];

      envios.forEach(envio => {
        if (envio.latitud != null && envio.longitud != null) {
          const markerColor = getEnvioMarkerColorHex(envio.status);
          const marker = new google.maps.Marker({
            position: { lat: envio.latitud, lng: envio.longitud },
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE, // Simple circle
              fillColor: markerColor,
              fillOpacity: 0.9,
              strokeColor: '#ffffff', // White border
              strokeWeight: 1.5,
              scale: 7, // Size of the circle
            },
            title: envio.nombre_cliente || envio.client_location,
          });

          marker.addListener('click', () => {
            const content = `
              <div style="font-family: sans-serif; font-size: 14px; max-width: 250px;">
                <h4 style="margin-top: 0; margin-bottom: 5px; font-weight: bold;">${envio.nombre_cliente || 'Destinatario Temporal'}</h4>
                <p style="margin: 2px 0;"><strong>Dirección:</strong> ${envio.client_location}</p>
                <p style="margin: 2px 0;"><strong>Paquete:</strong> ${envio.package_size}, ${envio.package_weight}kg</p>
                <p style="margin: 2px 0;"><strong>Estado:</strong> <span style="color: ${markerColor}; text-transform: capitalize;">${envio.status.replace(/_/g, ' ')}</span></p>
              </div>
            `;
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
          });
          newMarkers.push(marker);
        }
      });
      setMarkers(newMarkers);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, infoWindow, envios]); // markers dependency removed to avoid loop with setMarkers

  if (isLoadingApi) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-300px)] bg-muted/30 rounded-lg shadow">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Cargando mapa...</p>
      </div>
    );
  }

  if (errorLoadingApi) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] border-2 border-dashed border-destructive/50 bg-card p-8 rounded-lg shadow text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-semibold text-destructive mb-2">Error al Cargar el Mapa</h3>
        <p className="text-destructive/90 max-w-md">{errorLoadingApi}</p>
         {!GOOGLE_MAPS_API_KEY && <p className="text-sm mt-2 text-muted-foreground">Asegúrate de que la variable de entorno NEXT_PUBLIC_GOOGLE_MAPS_API_KEY esté configurada.</p>}
      </div>
    );
  }
  
  if(envios.length === 0 && !isLoadingApi && !errorLoadingApi){
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] border-2 border-dashed border-muted-foreground/30 bg-card p-8 rounded-lg shadow text-center">
            <Info className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No hay Envíos para Mostrar</h3>
            <p className="text-muted-foreground max-w-md">Actualmente no hay envíos geolocalizados en Mar del Plata para mostrar en el mapa.</p>
        </div>
    )
  }


  return <div ref={mapRef} style={{ height: 'calc(100vh - 250px)', width: '100%' }} className="rounded-lg shadow-md" />;
}
