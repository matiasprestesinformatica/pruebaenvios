
"use client";

import { useState } from "react";
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
import { TipoServicioForm } from "./tipo-servicio-form";
import type { TipoServicioFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import type { TipoServicio } from "@/types/supabase";

interface EditTipoServicioDialogProps {
  tipoServicio: TipoServicio;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  updateTipoServicioAction: (id: string, data: TipoServicioFormData) => Promise<{ success: boolean; error?: string | null; data?: TipoServicio | null }>;
}

export function EditTipoServicioDialog({ tipoServicio, isOpen, onOpenChange, updateTipoServicioAction }: EditTipoServicioDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: TipoServicioFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateTipoServicioAction(tipoServicio.id, data);
      if (result.success) {
        toast({ title: "Tipo de Servicio Actualizado", description: "Los cambios han sido guardados." });
        onOpenChange(false); 
      } else {
        toast({ title: "Error", description: result.error || "No se pudo actualizar.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error Inesperado", description: "Ocurrió un error.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Editar Tipo de Servicio: {tipoServicio.nombre}</DialogTitle>
          <DialogDescription>
            Modifique los campos para actualizar el tipo de servicio.
          </DialogDescription>
        </DialogHeader>
        <TipoServicioForm 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            initialData={tipoServicio}
            submitButtonText="Guardar Cambios"
        />
        <DialogFooter className="sm:justify-start mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    
    