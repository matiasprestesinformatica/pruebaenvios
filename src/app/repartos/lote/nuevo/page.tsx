
// No "use server"; directive at the top

import { PageHeader } from "@/components/page-header";
import { RepartoLoteCreateForm } from "@/components/reparto-lote-create-form";
import {
    getRepartidoresActivosAction,
    getEmpresasForRepartoAction,
    getClientesByEmpresaAction,
    createRepartoLoteAction
} from "../../actions"; // Corrected path
import { getTiposServicioActivosAction } from "@/app/configuracion/actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Repartidor, Empresa, TipoServicio } from "@/types/supabase";

interface NuevoRepartoLotePageContentProps {
  repartidores: Pick<Repartidor, 'id' | 'nombre'>[];
  empresas: Pick<Empresa, 'id' | 'nombre'>[];
  tiposServicio: Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[];
}

async function NuevoRepartoLotePageContent({ repartidores, empresas, tiposServicio }: NuevoRepartoLotePageContentProps) {
  return (
    <RepartoLoteCreateForm
      repartidores={repartidores}
      empresas={empresas}
      tiposServicio={tiposServicio}
      getClientesByEmpresaAction={getClientesByEmpresaAction}
      createRepartoLoteAction={createRepartoLoteAction}
    />
  );
}

export default async function NuevoRepartoLotePage() {
  // Fetch initial data needed for the form on the server
  const [repartidores, empresas, tiposServicio] = await Promise.all([
    getRepartidoresActivosAction(),
    getEmpresasForRepartoAction(),
    getTiposServicioActivosAction()
  ]);

  return (
    <>
      <PageHeader
        title="Crear Nuevo Reparto por Lote"
        description="Seleccione una empresa y sus clientes para generar un reparto por lote, asignando un valor de servicio a cada envío."
      />
      <Suspense fallback={<RepartoLoteFormSkeleton />}>
        <NuevoRepartoLotePageContent
            repartidores={repartidores || []} // Provide default empty array if fetch fails
            empresas={empresas || []}       // Provide default empty array if fetch fails
            tiposServicio={tiposServicio || []} // Provide default empty array if fetch fails
        />
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
