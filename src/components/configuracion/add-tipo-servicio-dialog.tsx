
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
import { TipoServicioForm } from "./tipo-servicio-form";
import type { TipoServicioFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import type { TipoServicio } from "@/types/supabase";

interface AddTipoServicioDialogProps {
  addTipoServicioAction: (data: TipoServicioFormData) => Promise<{ success: boolean; error?: string | null; data?: TipoServicio | null }>;
}

export function AddTipoServicioDialog({ addTipoServicioAction }: AddTipoServicioDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: TipoServicioFormData) => {
    setIsSubmitting(true);
    try {
      const result = await addTipoServicioAction(data);
      if (result.success) {
        toast({ title: "Tipo de Servicio Agregado", description: "El nuevo tipo de servicio ha sido guardado." });
        setOpen(false); 
      } else {
        toast({ title: "Error", description: result.error || "No se pudo guardar el tipo de servicio.", variant: "destructive" });
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
          Agregar Tipo Servicio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Tipo de Servicio</DialogTitle>
          <DialogDescription>
            Complete los campos para registrar un nuevo tipo de servicio y su precio base.
          </DialogDescription>
        </DialogHeader>
        <TipoServicioForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        <DialogFooter className="sm:justify-start mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    
    