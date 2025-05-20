
import { PageHeader } from "@/components/page-header";
import { MapaEnviosView } from "@/components/mapa-envios-view";
import { getEnviosGeolocalizadosAction, getRepartosForMapFilterAction } from "./actions";
import { RepartoMapFilter } from "@/components/reparto-map-filter";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, WifiOff } from "lucide-react";
import type { RepartoParaFiltro } from "@/types/supabase";

interface MapaEnviosPageProps {
  searchParams?: {
    repartoId?: string;
    // Add other search params if needed in the future
  };
}

async function MapaEnviosPageContent({ selectedRepartoId, repartosParaFiltro }: { selectedRepartoId?: string | null, repartosParaFiltro: RepartoParaFiltro[] }) {
  const { data: envios, error: enviosError } = await getEnviosGeolocalizadosAction(selectedRepartoId);

  if (enviosError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] border-2 border-dashed border-destructive/30 rounded-lg bg-card shadow p-8 text-center">
        <AlertTriangle className="w-20 h-20 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al Cargar Envíos</h2>
        <p className="text-destructive/80 max-w-md">
          {enviosError}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Por favor, verifique su conexión, las políticas RLS de Supabase, o si hay envíos geolocalizados.
        </p>
      </div>
    );
  }
  
  // This check might be redundant if handled by MapaEnviosView, but kept for clarity
  if (typeof window !== 'undefined' && !navigator.onLine) {
     return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] border-2 border-dashed border-muted-foreground/30 rounded-lg bg-card shadow p-8 text-center">
        <WifiOff className="w-20 h-20 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-muted-foreground mb-2">Sin Conexión a Internet</h2>
        <p className="text-muted-foreground max-w-md">
          No se puede cargar el mapa de envíos porque no hay conexión a internet.
        </p>
      </div>
    );
  }

  return (
    <>
      <RepartoMapFilter repartos={repartosParaFiltro} currentRepartoId={selectedRepartoId} />
      <MapaEnviosView envios={envios} />
    </>
  );
}

export default async function MapaEnviosPage({ searchParams }: MapaEnviosPageProps) {
  const selectedRepartoId = searchParams?.repartoId || "all";
  const { data: repartosParaFiltro, error: repartosError } = await getRepartosForMapFilterAction();

  if (repartosError) {
     // Handle error fetching repartos for filter, maybe show a simplified page or just the map
     console.error("Error fetching repartos for filter:", repartosError);
  }

  return (
    <>
      <PageHeader
        title="Mapa de Envíos"
        description="Visualice la ubicación de los envíos en Mar del Plata. Filtre por reparto o vea los no asignados."
      />
      <Suspense fallback={<MapaEnviosSkeleton />}>
        <MapaEnviosPageContent selectedRepartoId={selectedRepartoId} repartosParaFiltro={repartosParaFiltro || []} />
      </Suspense>
    </>
  );
}

function MapaEnviosSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full md:w-[350px] rounded-lg mb-6" /> {/* Skeleton for filter */}
      <Skeleton className="h-[calc(100vh-350px)] w-full rounded-md shadow" /> {/* Skeleton for map */}
    </div>
  );
}

export const dynamic = 'force-dynamic';
