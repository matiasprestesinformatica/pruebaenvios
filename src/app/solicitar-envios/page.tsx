
import { PageHeader } from "@/components/page-header";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { SolicitarEnvioForm } from "@/components/solicitar-envio-form";
import { getTiposPaqueteActivosAction, getTiposServicioActivosAction } from "@/app/configuracion/actions";
import { createEnvioIndividualAction } from "./actions"; // Import the new action
import type { TipoPaquete, TipoServicio } from "@/types/supabase";

interface SolicitarEnviosPageData {
  tiposPaquete: Pick<TipoPaquete, 'id' | 'nombre'>[];
  tiposServicio: Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[];
}

async function SolicitarEnvioPageContent() {
  let tiposPaqueteData: Pick<TipoPaquete, 'id' | 'nombre'>[] = [];
  let tiposServicioData: Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[] = [];
  let errorLoadingData: string | null = null;

  try {
    const [paquetesResult, serviciosResult] = await Promise.all([
      getTiposPaqueteActivosAction(),
      getTiposServicioActivosAction()
    ]);
    tiposPaqueteData = paquetesResult; // Assuming action returns array directly
    tiposServicioData = serviciosResult; // Assuming action returns array directly
  } catch (error) {
    console.error("Error fetching initial data for SolicitarEnvioPage:", error);
    errorLoadingData = "No se pudieron cargar los datos necesarios para el formulario. Intente más tarde.";
  }

  if (errorLoadingData) {
    return (
      <Alert variant="destructive" className="mt-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error de Carga</AlertTitle>
        <AlertDescription>{errorLoadingData}</AlertDescription>
      </Alert>
    );
  }

  return (
    <SolicitarEnvioForm
      tiposPaquete={tiposPaqueteData}
      tiposServicio={tiposServicioData}
      createEnvioIndividualAction={createEnvioIndividualAction}
    />
  );
}

export default async function SolicitarEnviosPage() {
  return (
    <>
      <PageHeader
        title="Solicitar Nuevo Envío"
        description="Complete el formulario para solicitar un nuevo envío. Nos pondremos en contacto a la brevedad."
      />
      <Suspense fallback={<SolicitarEnvioFormSkeleton />}>
        <SolicitarEnvioPageContent />
      </Suspense>
    </>
  );
}

function SolicitarEnvioFormSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6 lg:p-8 bg-card shadow-xl rounded-lg space-y-6">
      <Skeleton className="h-8 w-1/3 mb-2" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <hr className="my-4"/>
      <Skeleton className="h-8 w-1/3 mb-2" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <hr className="my-4"/>
      <Skeleton className="h-8 w-1/3 mb-2" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-20 w-full" />
       <hr className="my-4"/>
      <Skeleton className="h-8 w-1/3 mb-2" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <hr className="my-4"/>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-12 w-full mt-4" />
    </div>
  );
}

export const dynamic = 'force-dynamic';
