
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
import { EmpresaForm } from "./empresa-form";
import type { EmpresaFormData } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";

interface AddEmpresaDialogProps {
  addEmpresaAction: (data: EmpresaFormData) => Promise<{ success: boolean; error?: string | null }>;
}

export function AddEmpresaDialog({ addEmpresaAction }: AddEmpresaDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: EmpresaFormData) => {
    setIsSubmitting(true);
    try {
      const result = await addEmpresaAction(data);
      if (result.success) {
        toast({
          title: "Empresa Agregada",
          description: "La nueva empresa ha sido guardada exitosamente.",
        });
        setOpen(false); 
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo guardar la empresa.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
      console.error("Error adding empresa:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Building2 className="mr-2 h-4 w-4" />
          Agregar Empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Agregar Nueva Empresa</DialogTitle>
          <DialogDescription>
            Complete los campos a continuación para registrar una nueva empresa.
          </DialogDescription>
        </DialogHeader>
        <EmpresaForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
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
