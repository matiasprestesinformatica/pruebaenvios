
import { PageHeader } from "@/components/page-header";
import { AddRepartidorDialog } from "@/components/add-repartidor-dialog";
import { RepartidoresTable } from "@/components/repartidores-table";
import { addRepartidorAction, getRepartidoresAction } from "./actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface RepartidoresPageProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

async function RepartidoresData({ currentPage, searchTerm }: { currentPage: number; searchTerm?: string }) {
  const { data: repartidores, count, error } = await getRepartidoresAction(currentPage, 10, searchTerm);

  if (error) {
    return <p className="text-destructive">Error al cargar repartidores: {error}</p>;
  }

  return <RepartidoresTable initialRepartidores={repartidores} initialTotalCount={count} initialPage={currentPage} />;
}

export default async function RepartidoresPage({ searchParams }: RepartidoresPageProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const searchTerm = searchParams?.search || undefined;

  return (
    <>
      <PageHeader
        title="Gestión de Repartidores"
        description="Agregue, vea y administre los datos de sus repartidores."
        actions={<AddRepartidorDialog addRepartidorAction={addRepartidorAction} />}
      />
      <Suspense fallback={<RepartidoresTableSkeleton />}>
        <RepartidoresData currentPage={currentPage} searchTerm={searchTerm} />
      </Suspense>
    </>
  );
}

function RepartidoresTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-96 w-full rounded-md" />
      <div className="flex items-center justify-between pt-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
