
import { PageHeader } from "@/components/page-header";
import { ShipmentForm } from "@/components/shipment-form";
import { getClientesForShipmentFormAction, suggestDeliveryOptionsAction, createShipmentAction } from "../actions";
import { getTiposPaqueteActivosAction, getTiposServicioActivosAction } from "@/app/configuracion/actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShipmentFormData } from "@/lib/schemas";
import type { SuggestDeliveryOptionsOutput } from "@/ai/flows/suggest-delivery-options";
import type { Cliente, TipoPaquete, TipoServicio } from "@/types/supabase";


interface NuevoEnvioPageContentProps {
  clientes: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'email' | 'direccion' | 'latitud' | 'longitud'>[];
  tiposPaquete: Pick<TipoPaquete, 'id' | 'nombre'>[];
  tiposServicio: Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[];
}

async function NuevoEnvioPageContent({ clientes, tiposPaquete, tiposServicio }: NuevoEnvioPageContentProps) {
  const handleSuggestOptions = async (data: Pick<ShipmentFormData, 'client_location' | 'package_weight' | 'tipo_paquete_id'>) => {
    "use server"; 
    return suggestDeliveryOptionsAction(data);
  };
  
  const handleSubmitShipment = async (formData: ShipmentFormData, aiSuggestions?: SuggestDeliveryOptionsOutput) => {
    "use server";
    const result = await createShipmentAction(formData, aiSuggestions);
    return result; 
  };

  return (
    <ShipmentForm
      clientes={clientes}
      tiposPaquete={tiposPaquete}
      tiposServicio={tiposServicio}
      onSuggestOptions={handleSuggestOptions}
      onSubmitShipment={handleSubmitShipment}
    />
  );
}

export default async function NuevoEnvioPage() {
  const [clientes, tiposPaquete, tiposServicio] = await Promise.all([
    getClientesForShipmentFormAction(),
    getTiposPaqueteActivosAction(),
    getTiposServicioActivosAction()
  ]);

  return (
    <>
      <PageHeader
        title="Crear Nuevo Envío"
        description="Complete los detalles para generar un nuevo envío."
      />
      <Suspense fallback={<ShipmentFormSkeleton />}>
        <NuevoEnvioPageContent 
            clientes={clientes || []} 
            tiposPaquete={tiposPaquete || []}
            tiposServicio={tiposServicio || []}
        />
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
         <Skeleton className="h-10 w-full" /> 
         <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full sm:w-72" />
      <Skeleton className="h-10 w-full sm:w-48" />
    </div>
  );
}

export const dynamic = 'force-dynamic';
