
"use client";

import type { EnvioConClienteYAjustes } from "@/types/supabase";
import { estadoEnvioEnum } from "@/lib/schemas";
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
import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Edit3, Trash2, Eye, User, MapPin, Box, Weight } from "lucide-react"; // Package replaced by Box
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { EditShipmentDialog } from "./edit-shipment-dialog"; 
import { EnvioDetailDialog } from "./envio-detail-dialog"; 

interface EnviosTableProps {
  initialEnvios: EnvioConClienteYAjustes[];
  initialTotalCount: number;
  initialPage: number;
  pageSize?: number;
}

function ClientSideFormattedDate({ dateString }: { dateString: string }) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    try {
      const dateObject = parseISO(dateString);
      setFormattedDate(format(dateObject, "dd MMM yyyy, HH:mm", { locale: es }));
    } catch (e) {
      console.error("Error parsing date string:", dateString, e);
      setFormattedDate("Fecha inválida");
    }
  }, [dateString]);

  if (!formattedDate) {
    return <Skeleton className="h-4 w-28" />;
  }
  return <>{formattedDate}</>;
}

function getEstadoEnvioBadgeColor(estado: string | null): string {
  if (!estado) return 'bg-gray-400 text-white';
  const estadoMap: Record<string, string> = {
      pending: 'bg-yellow-500 text-black',
      suggested: 'bg-purple-500 text-white',
      asignado_a_reparto: 'bg-blue-500 text-white',
      en_transito: 'bg-orange-500 text-white',
      entregado: 'bg-green-500 text-white',
      cancelado: 'bg-red-500 text-white',
      problema_entrega: 'bg-pink-600 text-white',
    };
  return estadoMap[estado] || 'bg-gray-500 text-white';
}


export function EnviosTable({
  initialEnvios,
  initialTotalCount,
  initialPage,
  pageSize = 10,
}: EnviosTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [envios, setEnvios] = useState<EnvioConClienteYAjustes[]>(initialEnvios);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [isPending, startTransition] = useTransition();

  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [viewingShipmentId, setViewingShipmentId] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);


  useEffect(() => {
    setEnvios(initialEnvios);
    setTotalCount(initialTotalCount);
    setCurrentPage(initialPage);
  }, [initialEnvios, initialTotalCount, initialPage]);
  
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

  const handleOpenEditDialog = (shipmentId: string) => {
    setEditingShipmentId(shipmentId);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingShipmentId(null);
  };

  const handleOpenDetailDialog = (shipmentId: string) => {
    setViewingShipmentId(shipmentId);
    setIsDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setIsDetailDialogOpen(false);
    setViewingShipmentId(null);
  };


  return (
    <div className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Buscar envío..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? "Buscando..." : "Buscar"}
        </Button>
      </form>

      {isPending && <p className="text-muted-foreground">Cargando envíos...</p>}
      
      {!isPending && envios.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-lg">No se encontraron envíos.</p>
          {searchTerm && <p className="text-sm text-muted-foreground">Intente con otro término de búsqueda.</p>}
        </div>
      )}

      {!isPending && envios.length > 0 && (
        <Card className="shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente/Destino</TableHead>
                  <TableHead className="hidden md:table-cell">Ubicación</TableHead>
                  <TableHead className="hidden sm:table-cell">Paquete</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Registrado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envios.map((envio) => (
                  <TableRow key={envio.id}>
                    <TableCell>
                      <div className="font-medium flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground"/> 
                        {envio.clientes ? `${envio.clientes.nombre} ${envio.clientes.apellido}` : envio.nombre_cliente_temporal || "N/A"}
                      </div>
                      <div className="text-sm text-muted-foreground md:hidden mt-1 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5"/> {envio.client_location}
                      </div>
                       <div className="text-sm text-muted-foreground sm:hidden mt-1 flex items-center gap-1">
                         <Box className="h-3.5 w-3.5"/> 
                         {envio.tipos_paquete?.nombre || "N/A"}, {envio.package_weight}kg
                       </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{envio.client_location}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <Box className="h-4 w-4 text-muted-foreground"/> {envio.tipos_paquete?.nombre || "N/A"}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                         <Weight className="h-3.5 w-3.5"/> {envio.package_weight}kg
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getEstadoEnvioBadgeColor(envio.status)} capitalize`}>
                        {envio.status ? envio.status.replace(/_/g, ' ') : 'Desconocido'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <ClientSideFormattedDate dateString={envio.created_at} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 sm:gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDetailDialog(envio.id)} title="Ver Detalle del Envío">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(envio.id)} title="Editar Envío">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => alert(`Eliminar (ID: ${envio.id}) no implementado.`)} title="Eliminar Envío">
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
      
      {totalPages > 1 && !isPending && envios.length > 0 && (
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

      {isEditDialogOpen && editingShipmentId && (
        <EditShipmentDialog
          shipmentId={editingShipmentId}
          isOpen={isEditDialogOpen}
          onOpenChange={handleCloseEditDialog}
        />
      )}

      {isDetailDialogOpen && viewingShipmentId && (
        <EnvioDetailDialog
          envioId={viewingShipmentId}
          isOpen={isDetailDialogOpen}
          onOpenChange={handleCloseDetailDialog}
        />
      )}
    </div>
  );
}
