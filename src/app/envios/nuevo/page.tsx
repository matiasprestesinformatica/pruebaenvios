
import { PageHeader } from "@/components/page-header";
import { ShipmentForm } from "@/components/shipment-form";
import { getClientesForShipmentFormAction, suggestDeliveryOptionsAction, createShipmentAction } from "../actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShipmentFormData } from "@/lib/schemas";
import type { SuggestDeliveryOptionsOutput } from "@/ai/flows/suggest-delivery-options";


async function NewShipmentPageContent() {
  const clientes = await getClientesForShipmentFormAction();

  // This handler will be passed to the client component, but executed on server via form action
  const handleSuggestOptions = async (data: ShipmentFormData) => {
    "use server"; 
    return suggestDeliveryOptionsAction(data);
  };
  
  // This handler wraps the server action for creating a shipment
  const handleSubmitShipment = async (formData: ShipmentFormData, aiSuggestions?: SuggestDeliveryOptionsOutput) => {
    "use server";
    const result = await createShipmentAction(formData, aiSuggestions);
    // The client component (ShipmentForm) will handle toast and redirect based on this result.
    return result; 
  };


  return (
    <ShipmentForm
      clientes={clientes}
      onSuggestOptions={handleSuggestOptions}
      onSubmitShipment={handleSubmitShipment}
    />
  );
}


export default async function NuevoEnvioPage() {
  return (
    <>
      <PageHeader
        title="Crear Nuevo Envío"
        description="Complete los detalles para generar un nuevo envío y obtenga sugerencias de optimización."
      />
      <Suspense fallback={<ShipmentFormSkeleton />}>
        <NewShipmentPageContent />
      </Suspense>
    </>
  );
}

function ShipmentFormSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full sm:w-72" />
      <Skeleton className="h-10 w-full sm:w-48" />
    </div>
  );
}

export const dynamic = 'force-dynamic';
