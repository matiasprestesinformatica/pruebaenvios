
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Route } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RepartosListTable } from "@/components/repartos-list-table";
import { getRepartosListAction } from "./actions";

interface RepartosPageProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

async function RepartosData({ currentPage, searchTerm }: { currentPage: number; searchTerm?: string }) {
  const { data: repartos, count, error } = await getRepartosListAction(currentPage, 10, searchTerm);

  if (error) {
    return <p className="text-destructive">Error al cargar repartos: {error}</p>;
  }

  return <RepartosListTable initialRepartos={repartos} initialTotalCount={count} initialPage={currentPage} />;
}


export default async function RepartosPage({ searchParams }: RepartosPageProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const searchTerm = searchParams?.search || undefined;

  return (
    <>
      <PageHeader
        title="Gestión de Repartos y Viajes"
        description="Cree, asigne y administre el estado de los repartos."
        actions={
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/repartos/nuevo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Reparto
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<RepartosTableSkeleton />}>
        <RepartosData currentPage={currentPage} searchTerm={searchTerm} />
      </Suspense>
    </>
  );
}

function RepartosTableSkeleton() {
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
