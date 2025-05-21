
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
import { EmpresaForm } from "./empresa-form";
import type { EmpresaFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit3, Building } from "lucide-react";
import type { Empresa } from "@/types/supabase";
import { getEmpresaByIdAction } from "@/app/empresas/actions";
import { Skeleton } from "@/components/ui/skeleton";

interface EditEmpresaDialogProps {
  empresaId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  updateEmpresaAction: (empresaId: string, data: EmpresaFormData) => Promise<{ success: boolean; error?: string | null; data?: Empresa | null, info?: string | null }>;
}

export function EditEmpresaDialog({ empresaId, isOpen, onOpenChange, updateEmpresaAction }: EditEmpresaDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [empresaData, setEmpresaData] = useState<Partial<EmpresaFormData> | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && empresaId) {
      const fetchEmpresa = async () => {
        setIsLoadingData(true);
        try {
          const result = await getEmpresaByIdAction(empresaId);
          if (result.data) {
            const formData: Partial<EmpresaFormData> = {
                nombre: result.data.nombre,
                direccion: result.data.direccion,
                latitud: result.data.latitud,
                longitud: result.data.longitud,
                telefono: result.data.telefono ?? "",
                email: result.data.email ?? "",
                notas: result.data.notas ?? "",
                estado: result.data.estado,
            };
            setEmpresaData(formData);
          } else {
            toast({ title: "Error", description: result.error || "No se pudo cargar la empresa.", variant: "destructive" });
            onOpenChange(false); 
          }
        } catch (error) {
          console.error("Error fetching empresa for edit dialog", error);
          toast({ title: "Error al cargar datos", description: "No se pudieron cargar los datos de la empresa.", variant: "destructive" });
          onOpenChange(false);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchEmpresa();
    } else {
      setEmpresaData(null);
    }
  }, [isOpen, empresaId, onOpenChange, toast]);

  const handleSubmit = async (data: EmpresaFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateEmpresaAction(empresaId, data);
      if (result.success) {
        toast({
          title: "Empresa Actualizada",
          description: `Los datos de la empresa han sido actualizados. ${result.info || ''}`,
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Error al Actualizar",
          description: result.error || "No se pudo actualizar la empresa.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud de actualización.",
        variant: "destructive",
      });
      console.error("Error updating empresa:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Editar Empresa</DialogTitle>
          <DialogDescription>
            Modifique los campos a continuación para actualizar los datos de la empresa.
          </DialogDescription>
        </DialogHeader>
        {isLoadingData ? (
            <div className="space-y-4 py-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        ) : empresaData ? (
            <EmpresaForm 
                onSubmit={handleSubmit} 
                isSubmitting={isSubmitting} 
                initialData={empresaData}
                submitButtonText="Guardar Cambios"
            />
        ) : (
            <p className="py-4 text-muted-foreground">Cargando datos de la empresa...</p>
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

    