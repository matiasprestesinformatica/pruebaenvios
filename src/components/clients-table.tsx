
"use client";

import type { ClienteWithEmpresa } from "@/types/supabase";
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
import { ArrowLeft, ArrowRight, Edit3, Trash2, Building2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";


interface ClientsTableProps {
  initialClients: ClienteWithEmpresa[];
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

export function ClientsTable({
  initialClients,
  initialTotalCount,
  initialPage,
  pageSize = 10,
}: ClientsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<ClienteWithEmpresa[]>(initialClients);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setClients(initialClients);
    setTotalCount(initialTotalCount);
    setCurrentPage(initialPage);
  }, [initialClients, initialTotalCount, initialPage]);
  
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


  return (
    <div className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? "Buscando..." : "Buscar"}
        </Button>
      </form>

      {isPending && <p className="text-muted-foreground">Cargando clientes...</p>}
      
      {!isPending && clients.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-lg">No se encontraron clientes.</p>
          {searchTerm && <p className="text-sm text-muted-foreground">Intente con otro término de búsqueda.</p>}
        </div>
      )}

      {!isPending && clients.length > 0 && (
        <Card className="shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                  <TableHead className="hidden lg:table-cell">Empresa</TableHead>
                  <TableHead className="hidden lg:table-cell">Registrado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="font-medium">{client.nombre} {client.apellido}</div>
                      <div className="text-sm text-muted-foreground md:hidden">{client.email}</div>
                      {client.empresa && (
                        <Badge variant="secondary" className="mt-1 md:hidden flex items-center gap-1 w-fit">
                           <Building2 className="h-3 w-3" /> {client.empresa.nombre}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">{client.telefono}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {client.empresa ? (
                         <Badge variant="outline" className="flex items-center gap-1 w-fit">
                           <Building2 className="h-3 w-3" /> {client.empresa.nombre}
                         </Badge>
                      ) : (
                        <span className="text-muted-foreground/70">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <ClientSideFormattedDate dateString={client.created_at} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => alert(`Editar: ${client.id}`)} title="Editar Cliente">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => alert(`Eliminar: ${client.id}`)} title="Eliminar Cliente">
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
      
      {totalPages > 1 && !isPending && clients.length > 0 && (
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
