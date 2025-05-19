
"use client";

import type { RepartoConDetalles } from "@/types/supabase";
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
import { ArrowLeft, ArrowRight, Eye, Route, Building2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface RepartosListTableProps {
  initialRepartos: RepartoConDetalles[];
  initialTotalCount: number;
  initialPage: number;
  pageSize?: number;
}

function ClientSideFormattedDate({ dateString }: { dateString: string | null }) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!dateString) {
        setFormattedDate('-');
        return;
    }
    try {
      const dateObject = parseISO(dateString);
      setFormattedDate(format(dateObject, "dd MMM yyyy", { locale: es }));
    } catch (e) {
      console.error("Error parsing date string:", dateString, e);
      setFormattedDate("Fecha inválida");
    }
  }, [dateString]);

  if (!formattedDate) {
    return <Skeleton className="h-4 w-24" />;
  }
  return <>{formattedDate}</>;
}

function getEstadoBadgeVariant(estado: string) {
  switch (estado) {
    case 'asignado':
      return 'default'; // Blueish
    case 'en_curso':
      return 'secondary'; // Orange/Yellowish (using secondary for now, can customize)
    case 'completado':
      return 'outline'; // Greenish (using outline for now, can customize)
    default:
      return 'outline';
  }
}
function getEstadoBadgeColor(estado: string) {
    switch (estado) {
      case 'asignado':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'en_curso':
        return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'completado':
        return 'bg-green-500 hover:bg-green-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  }


export function RepartosListTable({
  initialRepartos,
  initialTotalCount,
  initialPage,
  pageSize = 10,
}: RepartosListTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [repartos, setRepartos] = useState<RepartoConDetalles[]>(initialRepartos);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRepartos(initialRepartos);
    setTotalCount(initialTotalCount);
    setCurrentPage(initialPage);
  }, [initialRepartos, initialTotalCount, initialPage]);
  
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
          placeholder="Buscar repartos..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? "Buscando..." : "Buscar"}
        </Button>
      </form>

      {isPending && <p className="text-muted-foreground">Cargando repartos...</p>}
      
      {!isPending && repartos.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-lg">No se encontraron repartos.</p>
          {searchTerm && <p className="text-sm text-muted-foreground">Intente con otro término de búsqueda.</p>}
        </div>
      )}

      {!isPending && repartos.length > 0 && (
        <Card className="shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Reparto</TableHead>
                  <TableHead>Repartidor</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Empresa (si aplica)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repartos.map((reparto) => (
                  <TableRow key={reparto.id}>
                    <TableCell>
                        <ClientSideFormattedDate dateString={reparto.fecha_reparto} />
                    </TableCell>
                    <TableCell>{reparto.repartidores?.nombre || <span className="text-muted-foreground">N/A</span>}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={reparto.tipo_reparto === 'individual' ? 'secondary' : 'outline'} className="capitalize flex items-center w-fit gap-1">
                        {reparto.tipo_reparto === 'individual' ? <Route className="h-3 w-3"/> : <Building2 className="h-3 w-3"/>}
                        {reparto.tipo_reparto.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {reparto.tipo_reparto === 'viaje_empresa' && reparto.empresas?.nombre ? (
                             <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <Building2 className="h-3 w-3" /> {reparto.empresas.nombre}
                             </Badge>
                        ) : <span className="text-muted-foreground/70">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEstadoBadgeVariant(reparto.estado)} className={`${getEstadoBadgeColor(reparto.estado)} capitalize`}>
                        {reparto.estado.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon" title="Ver Detalle">
                        <Link href={`/repartos/${reparto.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {totalPages > 1 && !isPending && repartos.length > 0 && (
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
