
import { PageHeader } from "@/components/page-header";
import { MapaEnviosView } from "@/components/mapa-envios-view";
import { getEnviosGeolocalizadosAction, getRepartosForMapFilterAction, getEnviosNoAsignadosGeolocalizadosAction } from "./actions";
import { RepartoMapFilter } from "@/components/reparto-map-filter";
import { EnviosNoAsignadosCard } from "@/components/envios-no-asignados-card";
import { MapaEnviosSummary } from "@/components/mapa-envios-summary";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, WifiOff } from "lucide-react";
import type { RepartoParaFiltro, EnvioMapa } from "@/types/supabase";

interface MapaEnviosPageProps {
  searchParams?: {
    repartoId?: string;
  };
}

interface MapaEnviosPageContentProps {
  selectedRepartoId?: string | null;
  repartosParaFiltro: RepartoParaFiltro[];
  initialUnassignedEnviosData: EnvioMapa[];
  initialUnassignedEnviosCount: number;
}

async function MapaEnviosPageContent({ 
  selectedRepartoId, 
  repartosParaFiltro,
  initialUnassignedEnviosData,
  initialUnassignedEnviosCount
}: MapaEnviosPageContentProps) {
  const { data: envios, error: enviosError } = await getEnviosGeolocalizadosAction(selectedRepartoId);

  if (enviosError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-400px)] border-2 border-dashed border-destructive/30 rounded-lg bg-card shadow p-8 text-center">
        <AlertTriangle className="w-20 h-20 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al Cargar Envíos del Mapa</h2>
        <p className="text-destructive/80 max-w-md">
          {enviosError}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Por favor, verifique su conexión, las políticas RLS de Supabase, o si hay envíos geolocalizados para el filtro seleccionado.
        </p>
      </div>
    );
  }
  
  const isFilteredBySpecificReparto = !!selectedRepartoId && selectedRepartoId !== "all" && selectedRepartoId !== "unassigned";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      <div className="lg:col-span-1 space-y-6 flex flex-col">
        <RepartoMapFilter repartos={repartosParaFiltro} currentRepartoId={selectedRepartoId} />
        <MapaEnviosSummary 
            displayedEnvios={envios || []} 
            unassignedEnviosCount={initialUnassignedEnviosCount}
            selectedRepartoId={selectedRepartoId}
            repartosList={repartosParaFiltro}
        />
        <EnviosNoAsignadosCard envios={initialUnassignedEnviosData} />
      </div>
      <div className="lg:col-span-3 h-[calc(100vh-250px)] min-h-[400px] lg:min-h-0">
        <MapaEnviosView envios={envios || []} isFilteredByReparto={isFilteredBySpecificReparto} />
      </div>
    </div>
  );
}

export default async function MapaEnviosPage({ searchParams }: MapaEnviosPageProps) {
  let rawRepartoId = searchParams?.repartoId || "all";
  if (rawRepartoId && rawRepartoId !== "all" && rawRepartoId !== "unassigned") {
    rawRepartoId = rawRepartoId.split('?')[0];
  }
  const selectedRepartoId = rawRepartoId;
  
  const [repartosFilterResult, enviosNoAsignadosResult] = await Promise.all([
    getRepartosForMapFilterAction(),
    getEnviosNoAsignadosGeolocalizadosAction()
  ]);

  const repartosParaFiltro = repartosFilterResult.data || [];
  const initialUnassignedEnviosData = enviosNoAsignadosResult.data || [];
  const initialUnassignedEnviosCount = enviosNoAsignadosResult.count || 0;


  if (repartosFilterResult.error) {
     console.error("Error fetching repartos for filter:", repartosFilterResult.error);
  }
  if (enviosNoAsignadosResult.error) {
    console.error("Error fetching initial unassigned envios:", enviosNoAsignadosResult.error);
  }

  return (
    <>
      <PageHeader
        title="Mapa de Envíos"
        description="Visualice la ubicación de los envíos en Mar del Plata. Filtre por reparto o vea los no asignados."
      />
      <Suspense fallback={<MapaEnviosSkeleton />}>
        <MapaEnviosPageContent 
          selectedRepartoId={selectedRepartoId} 
          repartosParaFiltro={repartosParaFiltro}
          initialUnassignedEnviosData={initialUnassignedEnviosData}
          initialUnassignedEnviosCount={initialUnassignedEnviosCount}
        />
      </Suspense>
    </>
  );
}

function MapaEnviosSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      <div className="lg:col-span-1 space-y-6">
        <Skeleton className="h-16 w-full rounded-lg" /> {/* Filter */}
        <Skeleton className="h-40 w-full rounded-lg" /> {/* Summary */}
        <Skeleton className="h-64 w-full rounded-lg" /> {/* Unassigned Card */}
      </div>
      <div className="lg:col-span-3">
        <Skeleton className="h-[calc(100vh-250px)] w-full rounded-md shadow" /> {/* Map */}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
