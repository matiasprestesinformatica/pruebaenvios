
"use client";

import { useState, useEffect } from "react";
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
import type { Empresa, Cliente } from "@/types/supabase"; // Import Cliente
import { getEmpresasForClientFormAction } from "@/app/clientes/actions"; 
import { Skeleton } from "@/components/ui/skeleton";


interface AddClientDialogProps {
  addClientAction: (data: ClientFormData) => Promise<{ success: boolean; error?: string | null; data?: Cliente | null, info?: string | null }>;
}

export function AddClientDialog({ addClientAction }: AddClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [empresas, setEmpresas] = useState<Pick<Empresa, 'id' | 'nombre'>[]>([]);
  const [isLoadingEmpresas, setIsLoadingEmpresas] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const fetchEmpresas = async () => {
        setIsLoadingEmpresas(true);
        try {
          const empresasData = await getEmpresasForClientFormAction();
          setEmpresas(empresasData);
        } catch (error) {
          console.error("Failed to fetch empresas for client form", error);
          toast({
            title: "Error al cargar empresas",
            description: "No se pudieron cargar las empresas para el formulario.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingEmpresas(false);
        }
      };
      fetchEmpresas();
    }
  }, [open, toast]);

  const handleSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const result = await addClientAction(data);
      if (result.success) {
        toast({
          title: "Cliente Agregado",
          description: `El nuevo cliente ha sido guardado exitosamente. ${result.info || ''}`,
        });
        setOpen(false);
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
        {isLoadingEmpresas ? (
            <div className="space-y-4 py-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        ) : (
            <ClientForm onSubmit={handleSubmit} isSubmitting={isSubmitting} empresas={empresas} />
        )}
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
