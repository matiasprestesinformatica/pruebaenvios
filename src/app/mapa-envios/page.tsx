
import { PageHeader } from "@/components/page-header";
import { MapaEnviosView } from "@/components/mapa-envios-view";
import { getEnviosGeolocalizadosAction } from "./actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, WifiOff } from "lucide-react";

async function MapaEnviosPageContent() {
  const { data: envios, error } = await getEnviosGeolocalizadosAction();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] border-2 border-dashed border-destructive/30 rounded-lg bg-card shadow p-8 text-center">
        <AlertTriangle className="w-20 h-20 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al Cargar Envíos</h2>
        <p className="text-destructive/80 max-w-md">
          {error}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Por favor, verifique su conexión, las políticas RLS de Supabase, o si hay envíos geolocalizados.
        </p>
      </div>
    );
  }
  
  if (typeof window !== 'undefined' && !navigator.onLine) {
     return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] border-2 border-dashed border-muted-foreground/30 rounded-lg bg-card shadow p-8 text-center">
        <WifiOff className="w-20 h-20 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-muted-foreground mb-2">Sin Conexión a Internet</h2>
        <p className="text-muted-foreground max-w-md">
          No se puede cargar el mapa de envíos porque no hay conexión a internet.
        </p>
      </div>
    );
  }


  return <MapaEnviosView envios={envios} />;
}

export default async function MapaEnviosPage() {
  return (
    <>
      <PageHeader
        title="Mapa de Envíos"
        description="Visualice la ubicación de los envíos en Mar del Plata."
      />
      <Suspense fallback={<MapaEnviosSkeleton />}>
        <MapaEnviosPageContent />
      </Suspense>
    </>
  );
}

function MapaEnviosSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[calc(100vh-250px)] w-full rounded-md shadow" />
    </div>
  );
}

export const dynamic = 'force-dynamic';
