
import { PageHeader } from "@/components/page-header";
import { RepartoLoteCreateForm } from "@/components/reparto-lote-create-form";
import { 
    getRepartidoresActivosAction, 
    getEmpresasForRepartoAction,
    getClientesByEmpresaAction,
    getEnviosByClientesAction,
    createRepartoLoteAction
} from "../../actions"; // Ajustado para usar actions del directorio padre
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

async function NuevoRepartoLotePageContent() {
  // Fetch initial data needed for the form
  const [repartidores, empresas] = await Promise.all([
    getRepartidoresActivosAction(),
    getEmpresasForRepartoAction(),
  ]);

  return (
    <RepartoLoteCreateForm
      repartidores={repartidores}
      empresas={empresas}
      getClientesByEmpresaAction={getClientesByEmpresaAction}
      getEnviosByClientesAction={getEnviosByClientesAction}
      createRepartoLoteAction={createRepartoLoteAction}
    />
  );
}

export default async function NuevoRepartoLotePage() {
  return (
    <>
      <PageHeader
        title="Crear Nuevo Reparto por Lote"
        description="Seleccione una empresa y sus clientes para generar un reparto por lote."
      />
      <Suspense fallback={<RepartoLoteFormSkeleton />}>
        <NuevoRepartoLotePageContent />
      </Suspense>
    </>
  );
}

function RepartoLoteFormSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full sm:w-72" />
      <Skeleton className="h-40 w-full" /> {/* Placeholder for clientes selection area */}
      <Skeleton className="h-40 w-full" /> {/* Placeholder for envios selection area */}
      <Skeleton className="h-10 w-full sm:w-48" />
    </div>
  );
}

export const dynamic = 'force-dynamic';
