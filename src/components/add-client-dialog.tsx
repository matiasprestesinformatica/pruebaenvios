
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
import { ClientForm } from "./client-form";
import type { ClientFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";

interface AddClientDialogProps {
  onClientAdded: () => void; // Callback to refresh client list
  addClientAction: (data: ClientFormData) => Promise<{ success: boolean; error?: string | null }>;
}

export function AddClientDialog({ onClientAdded, addClientAction }: AddClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const result = await addClientAction(data);
      if (result.success) {
        toast({
          title: "Cliente Agregado",
          description: "El nuevo cliente ha sido guardado exitosamente.",
        });
        onClientAdded(); // Refresh client list
        setOpen(false); // Close dialog
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo guardar el cliente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
      console.error("Error adding client:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Complete los campos a continuación para registrar un nuevo cliente.
          </DialogDescription>
        </DialogHeader>
        <ClientForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
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
