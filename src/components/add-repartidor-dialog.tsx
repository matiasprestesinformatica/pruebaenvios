
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
import { RepartidorForm } from "./repartidor-form";
import type { RepartidorFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { Bike } from "lucide-react";

interface AddRepartidorDialogProps {
  addRepartidorAction: (data: RepartidorFormData) => Promise<{ success: boolean; error?: string | null }>;
}

export function AddRepartidorDialog({ addRepartidorAction }: AddRepartidorDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: RepartidorFormData) => {
    setIsSubmitting(true);
    try {
      const result = await addRepartidorAction(data);
      if (result.success) {
        toast({
          title: "Repartidor Agregado",
          description: "El nuevo repartidor ha sido guardado exitosamente.",
        });
        setOpen(false); 
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo guardar el repartidor.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
      console.error("Error adding repartidor:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Bike className="mr-2 h-4 w-4" />
          Agregar Repartidor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Repartidor</DialogTitle>
          <DialogDescription>
            Complete los campos a continuación para registrar un nuevo repartidor.
          </DialogDescription>
        </DialogHeader>
        <RepartidorForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        <DialogFooter className="sm:justify-start mt-4">
            <DialogClose asChild>
                <Button type="button" variant="outline">
                Cancelar
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
