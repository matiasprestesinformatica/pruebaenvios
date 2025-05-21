
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { TipoPaqueteForm } from "./tipo-paquete-form";
import type { TipoPaqueteFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import type { TipoPaquete } from "@/types/supabase";

interface AddTipoPaqueteDialogProps {
  addTipoPaqueteAction: (data: TipoPaqueteFormData) => Promise<{ success: boolean; error?: string | null; data?: TipoPaquete | null }>;
}

export function AddTipoPaqueteDialog({ addTipoPaqueteAction }: AddTipoPaqueteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: TipoPaqueteFormData) => {
    setIsSubmitting(true);
    try {
      const result = await addTipoPaqueteAction(data);
      if (result.success) {
        toast({ title: "Tipo de Paquete Agregado", description: "El nuevo tipo de paquete ha sido guardado." });
        setOpen(false); 
      } else {
        toast({ title: "Error", description: result.error || "No se pudo guardar el tipo de paquete.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error Inesperado", description: "Ocurrió un error.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Tipo Paquete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Tipo de Paquete</DialogTitle>
          <DialogDescription>
            Complete los campos para registrar un nuevo tipo de paquete.
          </DialogDescription>
        </DialogHeader>
        <TipoPaqueteForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        <DialogFooter className="sm:justify-start mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    
    