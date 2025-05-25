
import { PageHeader } from "@/components/page-header";
import CaluloCotizadorExpress from "@/components/configuracion/CaluloCotizadorExpress";
import { getTarifasCalculadoraAction } from "@/app/calculadora/actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

async function CotizadorExpressData() {
  const { data: tarifas, error } = await getTarifasCalculadoraAction('express');

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error al Cargar Tarifas</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
   if (!tarifas || tarifas.length === 0) {
     return (
      <Alert variant="destructive" className="mt-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Sin Tarifas</AlertTitle>
        <AlertDescription>
            No se encontraron tarifas configuradas para el servicio Express. Por favor, contacte al administrador.
        </AlertDescription>
      </Alert>
    );
  }


  return <CaluloCotizadorExpress tarifas={tarifas} />;
}

export default async function CotizadorEnviosExpressPage() {
  return (
    <>
      <PageHeader
        title="Cotizador de Envíos Express"
        description="Calcule el costo estimado para sus envíos urgentes en Mar del Plata."
      />
      <Suspense fallback={<CotizadorSkeleton />}>
        <CotizadorExpressData />
      </Suspense>
    </>
  );
}

function CotizadorSkeleton() {
 return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8 bg-card shadow-xl rounded-lg space-y-6">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
        <Skeleton className="h-[400px] md:h-full w-full rounded-md" />
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
