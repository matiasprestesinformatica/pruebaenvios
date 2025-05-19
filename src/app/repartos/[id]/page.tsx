
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Package, AlertTriangle } from "lucide-react";
import { getRepartoDetailsAction, updateRepartoEstadoAction } from "../actions";
import { RepartoDetailView } from "@/components/reparto-detail-view";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface RepartoDetailPageProps {
  params: {
    id: string;
  };
}

async function RepartoDetailContent({ repartoId }: { repartoId: string }) {
  const { data: repartoCompleto, error } = await getRepartoDetailsAction(repartoId);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] border-2 border-dashed border-destructive/30 rounded-lg bg-card shadow p-8">
        <AlertTriangle className="w-24 h-24 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al Cargar Reparto</h2>
        <p className="text-destructive/80 text-center max-w-md">
          {error}
        </p>
      </div>
    );
  }

  if (!repartoCompleto) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] border-2 border-dashed border-muted-foreground/30 rounded-lg bg-card shadow p-8">
        <Package className="w-24 h-24 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-muted-foreground mb-2">Reparto no Encontrado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          No se pudo encontrar el reparto con el ID proporcionado.
        </p>
      </div>
    );
  }
  return <RepartoDetailView initialReparto={repartoCompleto} updateRepartoStatusAction={updateRepartoEstadoAction} />;
}

export default async function RepartoDetailPage({ params }: RepartoDetailPageProps) {
  const repartoId = params.id;

  return (
    <>
      <PageHeader
        title={`Detalle del Reparto`}
        description="Vea y administre los detalles y el estado de este reparto."
        actions={
          <Button asChild variant="outline">
            <Link href="/repartos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Repartos
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<RepartoDetailSkeleton />}>
        <RepartoDetailContent repartoId={repartoId} />
      </Suspense>
    </>
  );
}

function RepartoDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-48 rounded-md" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export const dynamic = 'force-dynamic';
