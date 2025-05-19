
"use client";

import type { Empresa } from "@/types/supabase";
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
import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Edit3, Trash2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface EmpresasTableProps {
  initialEmpresas: Empresa[];
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

export function EmpresasTable({
  initialEmpresas,
  initialTotalCount,
  initialPage,
  pageSize = 10,
}: EmpresasTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [empresas, setEmpresas] = useState<Empresa[]>(initialEmpresas);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEmpresas(initialEmpresas);
    setTotalCount(initialTotalCount);
    setCurrentPage(initialPage);
  }, [initialEmpresas, initialTotalCount, initialPage]);
  
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
    setCurrentPage(1); // Reset to first page on new search
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
          placeholder="Buscar empresa..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? "Buscando..." : "Buscar"}
        </Button>
      </form>

      {isPending && <p className="text-muted-foreground">Cargando empresas...</p>}
      
      {!isPending && empresas.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-lg">No se encontraron empresas.</p>
          {searchTerm && <p className="text-sm text-muted-foreground">Intente con otro término de búsqueda.</p>}
        </div>
      )}

      {!isPending && empresas.length > 0 && (
        <Card className="shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                  <TableHead className="hidden lg:table-cell">Registrada</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresas.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell>
                      <div className="font-medium">{empresa.nombre}</div>
                      <div className="text-sm text-muted-foreground md:hidden">{empresa.email || '-'}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{empresa.email || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{empresa.telefono || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <ClientSideFormattedDate dateString={empresa.created_at} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => alert(`Editar: ${empresa.id}`)} title="Editar Empresa">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => alert(`Eliminar: ${empresa.id}`)} title="Eliminar Empresa">
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
      
      {totalPages > 1 && !isPending && empresas.length > 0 && (
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
