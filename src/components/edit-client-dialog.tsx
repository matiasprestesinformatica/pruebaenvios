
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
import { ClientForm } from "./client-form";
import type { ClientFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit3, UserPlus } from "lucide-react";
import type { Empresa, Cliente } from "@/types/supabase";
import { getEmpresasForClientFormAction, getClientByIdAction } from "@/app/clientes/actions";
import { Skeleton } from "@/components/ui/skeleton";

interface EditClientDialogProps {
  clientId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  updateClientAction: (clientId: string, data: ClientFormData) => Promise<{ success: boolean; error?: string | null; data?: Cliente | null, info?: string | null }>;
}

export function EditClientDialog({ clientId, isOpen, onOpenChange, updateClientAction }: EditClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientData, setClientData] = useState<Partial<ClientFormData> | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [empresas, setEmpresas] = useState<Pick<Empresa, 'id' | 'nombre'>[]>([]);
  const [isLoadingEmpresas, setIsLoadingEmpresas] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && clientId) {
      const fetchClientAndEmpresas = async () => {
        setIsLoadingData(true);
        setIsLoadingEmpresas(true);
        try {
          const [clientResult, empresasData] = await Promise.all([
            getClientByIdAction(clientId),
            getEmpresasForClientFormAction()
          ]);

          if (clientResult.data) {
            // Map Supabase data to form data, ensuring nulls are handled for optional fields
            const formData: Partial<ClientFormData> = {
              nombre: clientResult.data.nombre,
              apellido: clientResult.data.apellido,
              direccion: clientResult.data.direccion,
              latitud: clientResult.data.latitud,
              longitud: clientResult.data.longitud,
              telefono: clientResult.data.telefono ?? "",
              email: clientResult.data.email ?? "",
              notas: clientResult.data.notas ?? "",
              empresa_id: clientResult.data.empresa_id ?? null,
              estado: clientResult.data.estado,
            };
            setClientData(formData);
          } else {
            toast({ title: "Error", description: clientResult.error || "No se pudo cargar el cliente.", variant: "destructive" });
            onOpenChange(false); // Close dialog if client data fails to load
          }
          setEmpresas(empresasData);
        } catch (error) {
          console.error("Error fetching data for edit client dialog", error);
          toast({ title: "Error al cargar datos", description: "No se pudieron cargar los datos necesarios para editar.", variant: "destructive" });
          onOpenChange(false);
        } finally {
          setIsLoadingData(false);
          setIsLoadingEmpresas(false);
        }
      };
      fetchClientAndEmpresas();
    } else {
      // Reset form data when dialog is closed or clientId is not available
      setClientData(null);
    }
  }, [isOpen, clientId, onOpenChange, toast]);

  const handleSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateClientAction(clientId, data);
      if (result.success) {
        toast({
          title: "Cliente Actualizado",
          description: `Los datos del cliente han sido actualizados. ${result.info || ''}`,
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Error al Actualizar",
          description: result.error || "No se pudo actualizar el cliente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud de actualización.",
        variant: "destructive",
      });
      console.error("Error updating client:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Modifique los campos a continuación para actualizar los datos del cliente.
          </DialogDescription>
        </DialogHeader>
        {isLoadingData || isLoadingEmpresas ? (
            <div className="space-y-4 py-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        ) : clientData ? (
            <ClientForm 
                onSubmit={handleSubmit} 
                isSubmitting={isSubmitting} 
                initialData={clientData}
                empresas={empresas}
                submitButtonText="Guardar Cambios"
            />
        ) : (
            <p className="py-4 text-muted-foreground">Cargando datos del cliente...</p>
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

    