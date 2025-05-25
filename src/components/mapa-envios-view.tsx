
"use client";

import React, { useEffect, useRef, useState } from 'react';
import type { EnvioMapa, TipoParadaEnum as TipoParadaEnumType } from '@/types/supabase';
import { estadoEnvioEnum, tipoParadaEnum } from "@/lib/schemas";
import { Loader2, AlertTriangle, Info as InfoIcon } from "lucide-react"; // Renamed Info to InfoIcon

interface MapaEnviosViewProps {
  envios: EnvioMapa[];
  isFilteredByReparto: boolean; 
}

const MAR_DEL_PLATA_CENTER = { lat: -38.0055, lng: -57.5426 };
const INITIAL_ZOOM = 13;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_SCRIPT_ID_RUMBOS = 'google-maps-api-script-rumbos'; 
let loadGoogleMapsPromiseRumbos: Promise<void> | null = null;

function getEnvioMarkerColorHex(status: string | null, tipoParada?: TipoParadaEnumType | null ): string {
  if (tipoParada === tipoParadaEnum.Values.retiro_empresa) return '#007bff'; // Blue for pickup
  if (!status) return '#A9A9A9'; 
  switch (status) {
    case estadoEnvioEnum.Values.pending: return '#FF0000'; // Red
    case estadoEnvioEnum.Values.suggested: return '#800080'; // Purple
    case estadoEnvioEnum.Values.asignado_a_reparto: return '#0000FF'; 
    case estadoEnvioEnum.Values.en_transito: return '#FFA500'; // Orange
    case estadoEnvioEnum.Values.entregado: return '#008000'; // Green
    case estadoEnvioEnum.Values.cancelado: return '#696969'; // Dark Gray
    case estadoEnvioEnum.Values.problema_entrega: return '#FF69B4'; // Hot Pink
    default: return '#A9A9A9'; 
  }
}

export function MapaEnviosView({ envios, isFilteredByReparto }: MapaEnviosViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [currentPolyline, setCurrentPolyline] = useState<google.maps.Polyline | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [errorLoadingApi, setErrorLoadingApi] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
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
    const loadMaps = async () => {
      if (typeof window.google?.maps?.DirectionsService === 'function') { // Check for a specific service too
        setIsLoadingApi(false);
        if (!map && mapRef.current) { // Initialize map if not already
            const newMap = new window.google.maps.Map(mapRef.current, {
                center: MAR_DEL_PLATA_CENTER, zoom: INITIAL_ZOOM, mapTypeControl: false, streetViewControl: false,
            });
            setMap(newMap);
            setInfoWindow(new window.google.maps.InfoWindow());
        }
        return;
      }

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
      
      setIsLoadingApi(true); 

      if (!loadGoogleMapsPromiseRumbos) {
        loadGoogleMapsPromiseRumbos = new Promise<void>((resolve, reject) => {
          const callbackName = 'initGoogleMapsApiForRumbosView';
          (window as any)[callbackName] = () => {
            delete (window as any)[callbackName]; 
            if (typeof window.google?.maps?.DirectionsService === 'function') {
              resolve();
            } else {
              reject(new Error("Google Maps API cargada pero 'DirectionsService' no está disponible."));
            }
          };

          if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID_RUMBOS)) {
            if (typeof window.google?.maps?.DirectionsService === 'function') {
                resolve(); 
            }
            return; 
          }

          const script = document.createElement('script');
          script.id = GOOGLE_MAPS_SCRIPT_ID_RUMBOS;          
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker,geometry,directions&callback=${callbackName}&loading=async`;
          script.async = true;
          script.defer = true;
          script.onerror = (err) => {
            delete (window as any)[callbackName];
            document.getElementById(GOOGLE_MAPS_SCRIPT_ID_RUMBOS)?.remove(); 
            loadGoogleMapsPromiseRumbos = null; 
            reject(new Error(`No se pudo cargar el script de Google Maps. Error: ${err ? (err as Event).type : 'desconocido'}`));
          };
          document.head.appendChild(script);
        });
      }

      try {
        await loadGoogleMapsPromiseRumbos;
        setIsLoadingApi(false);
         if (!map && mapRef.current) { // Initialize map after successful load
            const newMap = new window.google.maps.Map(mapRef.current, {
                center: MAR_DEL_PLATA_CENTER, zoom: INITIAL_ZOOM, mapTypeControl: false, streetViewControl: false,
            });
            setMap(newMap);
            setInfoWindow(new window.google.maps.InfoWindow());
        }
      } catch (error: any) {
        setErrorLoadingApi(error.message || "Error desconocido al cargar Google Maps API.");
        setIsLoadingApi(false);
      }
    };

    loadMaps();
  }, [isOnline, map]); 

  useEffect(() => {
    if (map && infoWindow && envios) {
      markers.forEach(marker => marker.setMap(null)); 
      if (currentPolyline) {
        currentPolyline.setMap(null); 
        setCurrentPolyline(null);
      }

      const newMarkers: google.maps.Marker[] = [];
      const bounds = new google.maps.LatLngBounds();
      let hasValidPointsForRoute = false;

      envios.forEach(envio => {
        if (envio.latitud != null && envio.longitud != null) {
          hasValidPointsForRoute = true;
          const position = { lat: envio.latitud, lng: envio.longitud };
          bounds.extend(position);

          const markerColor = getEnvioMarkerColorHex(envio.status, envio.tipo_parada);
          let markerLabel: google.maps.MarkerLabel | undefined = undefined;
          let zIndex = 1;
          let iconScale = 7;

          if (envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa) {
            markerLabel = { text: 'R', color: 'white', fontWeight: 'bold', fontSize: '12px' };
            zIndex = 10;
            iconScale = 9;
          } else if (envio.orden !== null && envio.orden !== undefined) {
            markerLabel = { text: (envio.orden + 1).toString(), color: 'white', fontWeight: 'bold', fontSize: '11px' };
            zIndex = 2;
            iconScale = 9;
          }

          const marker = new window.google.maps.Marker({
            position,
            map,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: markerColor,
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
              scale: iconScale,
            },
            label: markerLabel,
            title: envio.nombre_cliente || envio.client_location,
            zIndex: zIndex,
          });

          marker.addListener('click', () => {
            let orderInfo = '';
            if (envio.orden !== null && envio.orden !== undefined) {
              orderInfo = `<p style="margin: 2px 0;"><strong>Orden:</strong> ${envio.tipo_parada === tipoParadaEnum.Values.retiro_empresa ? 'Retiro (Punto de Partida)' : envio.orden + 1}</p>`;
            }
            const packageInfo = envio.tipo_parada === tipoParadaEnum.Values.entrega_cliente 
                ? `<p style="margin: 2px 0;"><strong>Paquete:</strong> ${envio.tipo_paquete_nombre || '-'}, ${envio.package_weight || '-'}kg</p>`
                : '';
            const statusInfo = envio.tipo_parada === tipoParadaEnum.Values.entrega_cliente && envio.status
                ? `<p style="margin: 2px 0;"><strong>Estado:</strong> <span style="color: ${markerColor}; text-transform: capitalize;">${envio.status.replace(/_/g, ' ')}</span></p>`
                : `<p style="margin: 2px 0;"><strong>Tipo:</strong> <span style="color: ${markerColor}; text-transform: capitalize;">Retiro en Empresa</span></p>`;

            const content = `
              <div style="font-family: sans-serif; font-size: 14px; max-width: 250px;">
                <h4 style="margin-top: 0; margin-bottom: 5px; font-weight: bold;">${envio.nombre_cliente || 'Punto de Interés'}</h4>
                <p style="margin: 2px 0;"><strong>Dirección:</strong> ${envio.client_location}</p>
                ${packageInfo}
                ${statusInfo}
                ${orderInfo}
              </div>
            `;
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
          });
          newMarkers.push(marker);
        }
      });
      setMarkers(newMarkers);

      if (hasValidPointsForRoute && newMarkers.length > 0) {
        if (newMarkers.length === 1 && envios.length === 1) { 
             map.setCenter(newMarkers[0].getPosition()!);
             map.setZoom(15);
        } else if (newMarkers.length > 1) { 
            map.fitBounds(bounds);
            const listener = google.maps.event.addListenerOnce(map, "idle", function() { // Use addListenerOnce
              if (map.getZoom()! > 16) map.setZoom(16);
            });
        }
      } else if (envios.length === 0) {
         map.setCenter(MAR_DEL_PLATA_CENTER);
         map.setZoom(INITIAL_ZOOM);
      }

      if (isFilteredByReparto && envios.length >= 2 && typeof window.google?.maps?.Polyline !== 'undefined') {
        const routePath = envios
          .filter(envio => envio.latitud != null && envio.longitud != null)
          .sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity)) 
          .map(envio => ({ lat: envio.latitud!, lng: envio.longitud! }));

        if (routePath.length >= 2) {
          const poly = new window.google.maps.Polyline({
            path: routePath,
            geodesic: true,
            strokeColor: '#4285F4', 
            strokeOpacity: 0.8,
            strokeWeight: 4,
            icons: [{
                icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 3,
                    strokeColor: '#4285F4'
                },
                offset: '100%',
                repeat: '75px' 
            }]
          });
          poly.setMap(map);
          setCurrentPolyline(poly);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, infoWindow, envios, isFilteredByReparto]); 

  if (isLoadingApi) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg shadow">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Cargando mapa...</p>
      </div>
    );
  }

  if (errorLoadingApi) {
    return (
      <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-destructive/50 bg-card p-8 rounded-lg shadow text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-semibold text-destructive mb-2">Error al Cargar el Mapa</h3>
        <p className="text-destructive/90 max-w-md">{errorLoadingApi}</p>
         {!GOOGLE_MAPS_API_KEY && <p className="text-sm mt-2 text-muted-foreground">Asegúrate de que la variable de entorno NEXT_PUBLIC_GOOGLE_MAPS_API_KEY esté configurada.</p>}
      </div>
    );
  }
  
  if(envios.length === 0 && !isLoadingApi && !errorLoadingApi){
    return (
        <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-muted-foreground/30 bg-card p-8 rounded-lg shadow text-center">
            <InfoIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No hay Envíos para Mostrar</h3>
            <p className="text-muted-foreground max-w-md">Actualmente no hay envíos geolocalizados en Mar del Plata para mostrar en el mapa con el filtro actual.</p>
        </div>
    )
  }

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} className="rounded-lg shadow-md border" />;
}

    