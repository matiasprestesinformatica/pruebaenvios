
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
import type { EnvioConCliente, Cliente } from "@/types/supabase";
import { 
    getEnvioByIdAction, 
    updateShipmentAction, 
    getClientesForShipmentFormAction,
    // suggestDeliveryOptionsAction // Not typically used for edit, but form can accept it
} from "@/app/envios/actions";
import { Skeleton } from "@/components/ui/skeleton";

interface EditShipmentDialogProps {
  shipmentId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditShipmentDialog({ shipmentId, isOpen, onOpenChange }: EditShipmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shipmentData, setShipmentData] = useState<Partial<ShipmentFormData> | null>(null);
  const [clientes, setClientes] = useState<Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'email' | 'direccion'>[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && shipmentId) {
      const fetchShipmentAndClientes = async () => {
        setIsLoadingData(true);
        try {
          const [shipmentResult, clientesData] = await Promise.all([
            getEnvioByIdAction(shipmentId),
            getClientesForShipmentFormAction()
          ]);

          if (shipmentResult.data) {
            const currentShipment = shipmentResult.data;
            const formData: Partial<ShipmentFormData> = {
              cliente_id: currentShipment.cliente_id,
              nombre_cliente_temporal: currentShipment.nombre_cliente_temporal || "",
              client_location: currentShipment.client_location,
              package_size: currentShipment.package_size as 'small' | 'medium' | 'large',
              package_weight: currentShipment.package_weight,
              status: currentShipment.status as ShipmentFormData['status'], // Cast to the enum type from schema
            };
            setShipmentData(formData);
          } else {
            toast({ title: "Error", description: shipmentResult.error || "No se pudo cargar el envío.", variant: "destructive" });
            onOpenChange(false);
          }
          setClientes(clientesData);
        } catch (error) {
          console.error("Error fetching data for edit shipment dialog", error);
          toast({ title: "Error al cargar datos", description: "No se pudieron cargar los datos necesarios para editar.", variant: "destructive" });
          onOpenChange(false);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchShipmentAndClientes();
    } else {
      setShipmentData(null);
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
        onOpenChange(false);
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
        description: "Ocurrió un error al procesar la solicitud de actualización.",
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
            </div>
        ) : shipmentData ? (
            <ShipmentForm 
                onSubmitShipment={handleSubmit} 
                initialData={shipmentData}
                clientes={clientes}
                isEditMode={true}
                // onSuggestOptions is not typically used in edit mode, but form can accept it
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
