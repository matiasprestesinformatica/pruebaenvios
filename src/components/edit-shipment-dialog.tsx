
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ShipmentForm } from "./shipment-form";
import type { ShipmentFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { EnvioCompletoParaDialog, Cliente, TipoPaquete, TipoServicio } from "@/types/supabase";
import { 
    getEnvioByIdAction, 
    updateShipmentAction, 
    getClientesForShipmentFormAction 
} from "@/app/envios/actions"; // Removed suggestDeliveryOptionsAction as it's not used here
import { getTiposPaqueteActivosAction, getTiposServicioActivosAction } from "@/app/configuracion/actions";
import { Skeleton } from "@/components/ui/skeleton";

interface EditShipmentDialogProps {
  shipmentId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditShipmentDialog({ shipmentId, isOpen, onOpenChange }: EditShipmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialShipmentData, setInitialShipmentData] = useState<Partial<ShipmentFormData> | null>(null);
  const [clientes, setClientes] = useState<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'email' | 'direccion' | 'latitud' | 'longitud'>[]>([]);
  const [tiposPaquete, setTiposPaquete] = useState<Pick<TipoPaquete, 'id' | 'nombre'>[]>([]);
  const [tiposServicio, setTiposServicio] = useState<Pick<TipoServicio, 'id' | 'nombre' | 'precio_base'>[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && shipmentId) {
      const fetchShipmentRelatedData = async () => {
        setIsLoadingData(true);
        setInitialShipmentData(null); // Reset initial data on open/ID change
        try {
          const [shipmentResult, clientesData, tiposPaqueteData, tiposServicioData] = await Promise.all([
            getEnvioByIdAction(shipmentId),
            getClientesForShipmentFormAction(),
            getTiposPaqueteActivosAction(),
            getTiposServicioActivosAction()
          ]);

          if (shipmentResult.data) {
            const currentShipment = shipmentResult.data;
            // Map EnvioCompletoParaDialog to ShipmentFormData
            const formData: Partial<ShipmentFormData> = {
              cliente_id: currentShipment.cliente_id,
              nombre_cliente_temporal: currentShipment.nombre_cliente_temporal || "",
              client_location: currentShipment.client_location,
              tipo_paquete_id: currentShipment.tipo_paquete_id,
              package_weight: currentShipment.package_weight,
              status: currentShipment.status as ShipmentFormData['status'], // Cast as it's compatible
              tipo_servicio_id: currentShipment.tipo_servicio_id,
              precio_servicio_final: currentShipment.precio_servicio_final,
              // Ensure other fields required by ShipmentFormData but not directly in EnvioCompletoParaDialog are handled if any
            };
            setInitialShipmentData(formData);
          } else {
            toast({ title: "Error", description: shipmentResult.error || "No se pudo cargar el envío.", variant: "destructive" });
            onOpenChange(false); // Close dialog if shipment data fails to load
          }
          setClientes(clientesData || []);
          setTiposPaquete(tiposPaqueteData || []);
          setTiposServicio(tiposServicioData || []);
        } catch (error) {
          console.error("Error fetching data for edit shipment dialog", error);
          toast({ title: "Error al cargar datos", description: "No se pudieron cargar los datos necesarios para editar.", variant: "destructive" });
          onOpenChange(false);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchShipmentRelatedData();
    } else if (!isOpen) {
      // Optionally reset data when dialog is closed, though useEffect above handles re-fetch on open
      // setInitialShipmentData(null); 
    }
  }, [isOpen, shipmentId, onOpenChange, toast]);

  const handleSubmit = async (data: ShipmentFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateShipmentAction(shipmentId, data);
      if (result.success) {
        toast({
          title: "Envío Actualizado",
          description: `Los datos del envío han sido actualizados. ${result.info || ''}`,
        });
        onOpenChange(false); // Close dialog on success
      } else {
        toast({
          title: "Error al Actualizar",
          description: result.error || "No se pudo actualizar el envío.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Inesperado",
        description: (error instanceof Error ? error.message : "Ocurrió un error desconocido.") + "Ocurrió un error al procesar la solicitud de actualización.",
        variant: "destructive",
      });
      console.error("Error updating shipment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Editar Envío</DialogTitle>
          <DialogDescription>
            Modifique los campos a continuación para actualizar los datos del envío.
          </DialogDescription>
        </DialogHeader>
        {isLoadingData ? (
            <div className="space-y-4 py-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        ) : initialShipmentData ? (
            <ShipmentForm 
                onSubmitShipment={handleSubmit} 
                initialData={initialShipmentData}
                clientes={clientes}
                tiposPaquete={tiposPaquete}
                tiposServicio={tiposServicio}
                isEditMode={true}
                onSuggestOptions={undefined} // Explicitly disable AI suggestions for edit mode
                onOpenChange={onOpenChange}
            />
        ) : (
            <p className="py-4 text-muted-foreground">Cargando datos del envío...</p>
        )}
        <DialogFooter className="sm:justify-start mt-4">
            <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
