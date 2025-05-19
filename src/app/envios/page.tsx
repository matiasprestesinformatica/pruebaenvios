
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EnviosTable } from "@/components/envios-table"; 
import { getEnviosAction } from "./actions";

interface EnviosPageProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

async function EnviosData({ currentPage, searchTerm }: { currentPage: number; searchTerm?: string }) {
  const { data: envios, count, error } = await getEnviosAction(currentPage, 10, searchTerm);

  if (error) {
    return <p className="text-destructive">Error al cargar envíos: {error}</p>;
  }

  return <EnviosTable initialEnvios={envios} initialTotalCount={count} initialPage={currentPage} />;
}

export default async function EnviosPage({ searchParams }: EnviosPageProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const searchTerm = searchParams?.search || undefined;

  return (
    <>
      <PageHeader
        title="Gestión de Envíos"
        description="Cree y administre sus envíos."
        actions={
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/envios/nuevo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Envío
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<EnviosTableSkeleton />}>
        <EnviosData currentPage={currentPage} searchTerm={searchTerm} />
      </Suspense>
    </>
  );
}

function EnviosTableSkeleton() {
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
