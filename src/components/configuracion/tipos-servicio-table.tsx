
"use client";

import type { TipoServicio } from "@/types/supabase";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Edit3 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { updateTipoServicioEstadoAction, getTipoServicioByIdAction, updateTipoServicioAction } from "@/app/configuracion/actions";
import { EditTipoServicioDialog } from "./edit-tipo-servicio-dialog";

interface TiposServicioTableProps {
  initialData: TipoServicio[];
  initialTotalCount: number;
  initialPage: number;
  pageSize?: number;
  onUpdateEstado: typeof updateTipoServicioEstadoAction;
  onGetById: typeof getTipoServicioByIdAction;
  onUpdate: typeof updateTipoServicioAction;
}

function ClientSideFormattedDate({ dateString }: { dateString: string }) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);
  useEffect(() => {
    try {
      setFormattedDate(format(parseISO(dateString), "dd MMM yyyy, HH:mm", { locale: es }));
    } catch (e) {
      setFormattedDate("Fecha inválida");
    }
  }, [dateString]);
  if (!formattedDate) return <Skeleton className="h-4 w-28" />;
  return <>{formattedDate}</>;
}

export function TiposServicioTable({
  initialData,
  initialTotalCount,
  initialPage,
  pageSize = 10,
  onUpdateEstado,
  onGetById,
  onUpdate,
}: TiposServicioTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [items, setItems] = useState<TipoServicio[]>(initialData);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('searchTiposServicio') || "");
  const [isPending, startTransition] = useTransition();
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  
  const [editingItem, setEditingItem] = useState<TipoServicio | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    setItems(initialData);
    setTotalCount(initialTotalCount);
    setCurrentPage(initialPage);
  }, [initialData, initialTotalCount, initialPage]);
  
  const totalPages = Math.ceil(totalCount / pageSize);

  const updateQueryParams = (page: number, search: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('pageTiposServicio', page.toString());
    if (search) params.set('searchTiposServicio', search);
    else params.delete('searchTiposServicio');
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value);
  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPage(1); 
    updateQueryParams(1, searchTerm);
  };
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateQueryParams(newPage, searchTerm);
  };

  const handleEstadoChange = async (id: string, nuevoEstado: boolean) => {
    setUpdatingStatusId(id);
    const result = await onUpdateEstado(id, nuevoEstado);
    setUpdatingStatusId(null);
    if (result.success) {
      toast({ title: "Estado Actualizado", description: `El estado del tipo de servicio ha sido ${nuevoEstado ? 'activado' : 'desactivado'}.` });
      setItems(prev => prev.map(item => item.id === id ? { ...item, activo: nuevoEstado } : item));
    } else {
      toast({ title: "Error", description: result.error || "No se pudo actualizar el estado.", variant: "destructive" });
    }
  };
  
  const handleOpenEditDialog = async (id: string) => {
    const { data, error } = await onGetById(id);
    if (data) {
      setEditingItem(data);
      setIsEditDialogOpen(true);
    } else {
      toast({ title: "Error", description: error || "No se pudo cargar el tipo de servicio para editar.", variant: "destructive"});
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '-';
    return `$${price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <Input type="text" placeholder="Buscar tipo de servicio..." value={searchTerm} onChange={handleSearchChange} className="max-w-sm" />
        <Button type="submit" variant="outline" disabled={isPending}>Buscar</Button>
      </form>

      {isPending && <p className="text-muted-foreground">Cargando...</p>}
      {!isPending && items.length === 0 && (
        <div className="text-center py-8"><p className="text-muted-foreground text-lg">No se encontraron tipos de servicio.</p></div>
      )}

      {!isPending && items.length > 0 && (
        <Card className="shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción</TableHead>
                  <TableHead className="text-right">Precio Base</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Creado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-xs">{item.descripcion || '-'}</TableCell>
                    <TableCell className="text-right font-mono">{formatPrice(item.precio_base)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Switch id={`estado-servicio-${item.id}`} checked={item.activo} onCheckedChange={(val) => handleEstadoChange(item.id, val)} disabled={updatingStatusId === item.id} />
                        <Badge variant={item.activo ? "default" : "secondary"} className={item.activo ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}>
                          {item.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell"><ClientSideFormattedDate dateString={item.created_at} /></TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(item.id)} title="Editar"><Edit3 className="h-4 w-4" /></Button>
                        {/* <Button variant="ghost" size="icon" onClick={() => alert(`Eliminar: ${item.nombre}`)} title="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button> */}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {totalPages > 1 && !isPending && items.length > 0 && (
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
          <Button variant="outline" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Siguiente</Button>
        </div>
      )}

      {editingItem && isEditDialogOpen && (
        <EditTipoServicioDialog
          tipoServicio={editingItem}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          updateTipoServicioAction={onUpdate}
        />
      )}
    </div>
  );
}
    
    