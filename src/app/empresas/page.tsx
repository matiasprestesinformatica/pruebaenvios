
import { PageHeader } from "@/components/page-header";
import { AddEmpresaDialog } from "@/components/add-empresa-dialog";
import { EmpresasTable } from "@/components/empresas-table";
import { addEmpresaAction, getEmpresasAction } from "./actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface EmpresasPageProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

async function EmpresasData({ currentPage, searchTerm }: { currentPage: number; searchTerm?: string }) {
  const { data: empresas, count, error } = await getEmpresasAction(currentPage, 10, searchTerm);

  if (error) {
    return <p className="text-destructive">Error al cargar empresas: {error}</p>;
  }

  return <EmpresasTable initialEmpresas={empresas} initialTotalCount={count} initialPage={currentPage} />;
}

export default async function EmpresasPage({ searchParams }: EmpresasPageProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const searchTerm = searchParams?.search || undefined;

  return (
    <>
      <PageHeader
        title="Gestión de Empresas"
        description="Agregue, vea y administre los datos de sus empresas."
        actions={<AddEmpresaDialog addEmpresaAction={addEmpresaAction} />}
      />
      <Suspense fallback={<EmpresasTableSkeleton />}>
        <EmpresasData currentPage={currentPage} searchTerm={searchTerm} />
      </Suspense>
    </>
  );
}

function EmpresasTableSkeleton() {
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
