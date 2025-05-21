
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
import { TipoPaqueteForm } from "./tipo-paquete-form";
import type { TipoPaqueteFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import type { TipoPaquete } from "@/types/supabase";

interface EditTipoPaqueteDialogProps {
  tipoPaquete: TipoPaquete;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  updateTipoPaqueteAction: (id: string, data: TipoPaqueteFormData) => Promise<{ success: boolean; error?: string | null; data?: TipoPaquete | null }>;
}

export function EditTipoPaqueteDialog({ tipoPaquete, isOpen, onOpenChange, updateTipoPaqueteAction }: EditTipoPaqueteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: TipoPaqueteFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateTipoPaqueteAction(tipoPaquete.id, data);
      if (result.success) {
        toast({ title: "Tipo de Paquete Actualizado", description: "Los cambios han sido guardados." });
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
          <DialogTitle>Editar Tipo de Paquete: {tipoPaquete.nombre}</DialogTitle>
          <DialogDescription>
            Modifique los campos para actualizar el tipo de paquete.
          </DialogDescription>
        </DialogHeader>
        <TipoPaqueteForm 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            initialData={tipoPaquete}
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
    
    