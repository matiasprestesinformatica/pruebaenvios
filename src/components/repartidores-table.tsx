
"use client";

import type { Repartidor } from "@/types/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Edit3, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateRepartidorEstadoAction } from "@/app/repartidores/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface RepartidoresTableProps {
  initialRepartidores: Repartidor[];
  initialTotalCount: number;
  initialPage: number;
  pageSize?: number;
}

export function RepartidoresTable({
  initialRepartidores,
  initialTotalCount,
  initialPage,
  pageSize = 10,
}: RepartidoresTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [repartidores, setRepartidores] = useState<Repartidor[]>(initialRepartidores);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [isPending, startTransition] = useTransition();
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    setRepartidores(initialRepartidores);
    setTotalCount(initialTotalCount);
    setCurrentPage(initialPage);
  }, [initialRepartidores, initialTotalCount, initialPage]);
  
  const totalPages = Math.ceil(totalCount / pageSize);

  const updateQueryParams = (page: number, search: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPage(1);
    updateQueryParams(1, searchTerm);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateQueryParams(newPage, searchTerm);
  };

  const handleEstadoChange = async (repartidorId: string, newEstado: boolean) => {
    setUpdatingStatusId(repartidorId);
    const result = await updateRepartidorEstadoAction(repartidorId, newEstado);
    setUpdatingStatusId(null);
    if (result.success) {
      toast({
        title: "Estado Actualizado",
        description: `El estado del repartidor ha sido ${newEstado ? 'activado' : 'desactivado'}.`,
      });
      // Optimistically update local state or rely on revalidation
      setRepartidores(prev => 
        prev.map(r => r.id === repartidorId ? {...r, estado: newEstado} : r)
      );
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Buscar repartidor por nombre..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? "Buscando..." : "Buscar"}
        </Button>
      </form>

      {isPending && <p className="text-muted-foreground">Cargando repartidores...</p>}
      
      {!isPending && repartidores.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-lg">No se encontraron repartidores.</p>
          {searchTerm && <p className="text-sm text-muted-foreground">Intente con otro término de búsqueda.</p>}
        </div>
      )}

      {!isPending && repartidores.length > 0 && (
         <Card className="shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repartidores.map((repartidor) => (
                  <TableRow key={repartidor.id}>
                    <TableCell className="font-medium">{repartidor.nombre}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Switch
                          id={`estado-${repartidor.id}`}
                          checked={repartidor.estado}
                          onCheckedChange={(newEstado) => handleEstadoChange(repartidor.id, newEstado)}
                          disabled={updatingStatusId === repartidor.id}
                          aria-label={`Estado de ${repartidor.nombre}`}
                        />
                         <Badge variant={repartidor.estado ? "default" : "secondary"} className={repartidor.estado ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}>
                          {repartidor.estado ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => alert(`Editar: ${repartidor.id}`)} title="Editar Repartidor">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => alert(`Eliminar: ${repartidor.id}`)} title="Eliminar Repartidor">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {totalPages > 1 && !isPending && repartidores.length > 0 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isPending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isPending}
          >
            Siguiente <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
