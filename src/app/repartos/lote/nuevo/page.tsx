
import { PageHeader } from "@/components/page-header";
import { RepartoLoteCreateForm } from "@/components/reparto-lote-create-form";
import {
    getRepartidoresActivosAction,
    getEmpresasForRepartoAction,
    getClientesByEmpresaAction,
    createRepartoLoteAction
} from "../../actions"; // Corrected path
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
// Types are not strictly needed here if passed as props from Server Component to Client Component
// import type { Repartidor, Empresa } from "@/types/supabase";

interface NuevoRepartoLotePageContentProps {
  repartidores: Awaited<ReturnType<typeof getRepartidoresActivosAction>>;
  empresas: Awaited<ReturnType<typeof getEmpresasForRepartoAction>>;
}

async function NuevoRepartoLotePageContent({ repartidores, empresas }: NuevoRepartoLotePageContentProps) {
  // getClientesByEmpresaAction and createRepartoLoteAction will be passed directly
  // to RepartoLoteCreateForm, as they are Server Actions.
  return (
    <RepartoLoteCreateForm
      repartidores={repartidores}
      empresas={empresas}
      getClientesByEmpresaAction={getClientesByEmpresaAction}
      createRepartoLoteAction={createRepartoLoteAction}
    />
  );
}

export default async function NuevoRepartoLotePage() {
  // Fetch initial data needed for the form directly in the Server Component
  const repartidores = await getRepartidoresActivosAction();
  const empresas = await getEmpresasForRepartoAction();

  return (
    <>
      <PageHeader
        title="Crear Nuevo Reparto por Lote"
        description="Seleccione una empresa y sus clientes para generar un reparto por lote."
      />
      <Suspense fallback={<RepartoLoteFormSkeleton />}>
        <NuevoRepartoLotePageContent repartidores={repartidores} empresas={empresas} />
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
      <Skeleton className="h-10 w-full sm:w-48" />
    </div>
  );
}

export const dynamic = 'force-dynamic';
