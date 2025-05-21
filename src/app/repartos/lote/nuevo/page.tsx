
"use server"; // This page is a Server Component

import { PageHeader } from "@/components/page-header";
import { RepartoLoteCreateForm } from "@/components/reparto-lote-create-form";
import {
    getRepartidoresActivosAction,
    getEmpresasForRepartoAction,
    getClientesByEmpresaAction,
    createRepartoLoteAction
} from "../actions"; // Corrected path
import { getTiposServicioActivosAction } from "@/app/configuracion/actions"; // Import for service types
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface NuevoRepartoLotePageContentProps {
  repartidores: Awaited<ReturnType<typeof getRepartidoresActivosAction>>;
  empresas: Awaited<ReturnType<typeof getEmpresasForRepartoAction>>;
  tiposServicio: Awaited<ReturnType<typeof getTiposServicioActivosAction>>;
}

async function NuevoRepartoLotePageContent({ repartidores, empresas, tiposServicio }: NuevoRepartoLotePageContentProps) {
  return (
    <RepartoLoteCreateForm
      repartidores={repartidores}
      empresas={empresas}
      tiposServicio={tiposServicio} // Pass service types to the form
      getClientesByEmpresaAction={getClientesByEmpresaAction}
      createRepartoLoteAction={createRepartoLoteAction}
    />
  );
}

export default async function NuevoRepartoLotePage() {
  const [repartidores, empresas, tiposServicio] = await Promise.all([
    getRepartidoresActivosAction(),
    getEmpresasForRepartoAction(),
    getTiposServicioActivosAction() // Fetch active service types
  ]);

  return (
    <>
      <PageHeader
        title="Crear Nuevo Reparto por Lote"
        description="Seleccione una empresa y sus clientes para generar un reparto por lote, asignando un valor de servicio a cada envío."
      />
      <Suspense fallback={<RepartoLoteFormSkeleton />}>
        <NuevoRepartoLotePageContent repartidores={repartidores} empresas={empresas} tiposServicio={tiposServicio} />
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
