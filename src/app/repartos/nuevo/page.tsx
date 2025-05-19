
import { PageHeader } from "@/components/page-header";
import { RepartoCreateForm } from "@/components/reparto-create-form";
import { 
    getRepartidoresActivosAction, 
    getEmpresasForRepartoAction,
    getEnviosPendientesAction,
    getEnviosPendientesPorEmpresaAction,
    createRepartoAction
} from "../actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

async function NuevoRepartoPageContent() {
  // Fetch initial data needed for the form
  const [repartidores, empresas, enviosPendientes] = await Promise.all([
    getRepartidoresActivosAction(),
    getEmpresasForRepartoAction(),
    getEnviosPendientesAction() // Initial load for individual envios
  ]);

  return (
    <RepartoCreateForm
      repartidores={repartidores}
      empresas={empresas}
      initialEnviosPendientes={enviosPendientes}
      getEnviosPendientesAction={getEnviosPendientesAction}
      getEnviosPendientesPorEmpresaAction={getEnviosPendientesPorEmpresaAction}
      createRepartoAction={createRepartoAction}
    />
  );
}

export default async function NuevoRepartoPage() {
  return (
    <>
      <PageHeader
        title="Crear Nuevo Reparto"
        description="Planifique y asigne envíos a un repartidor para una fecha específica."
      />
      <Suspense fallback={<RepartoFormSkeleton />}>
        <NuevoRepartoPageContent />
      </Suspense>
    </>
  );
}

function RepartoFormSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full sm:w-72" />
      <Skeleton className="h-40 w-full" /> {/* Placeholder for envios selection area */}
      <Skeleton className="h-10 w-full sm:w-48" />
    </div>
  );
}

export const dynamic = 'force-dynamic';
