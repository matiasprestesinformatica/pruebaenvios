
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getEnvioByIdAction } from "@/app/envios/actions";
import type { EnvioCompletoParaDialog } from "@/types/supabase";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    AlertTriangle, 
    Loader2, 
    User, 
    MapPin, 
    Mail, 
    Phone, 
    Weight, 
    Info, 
    CalendarDays, 
    Truck, 
    Link as LinkIcon,
    DollarSign,
    Lightbulb,
    HelpCircle,
    Box as BoxIcon,
    Hash
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils"; 

interface EnvioDetailDialogProps {
  envioId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function ClientSideFormattedDate({ dateString, formatString = "dd MMM yyyy, HH:mm" }: { dateString: string | null, formatString?: string }) {
    const [formattedDate, setFormattedDate] = useState<string | null>(null);
    useEffect(() => {
        if (!dateString) {
            setFormattedDate('-');
            return;
        }
        try {
            setFormattedDate(format(parseISO(dateString), formatString, { locale: es }));
        } catch (e) {
            console.error("Error parsing date for detail dialog:", dateString, e);
            setFormattedDate("Fecha inválida");
        }
    }, [dateString, formatString]);

    if (formattedDate === null) {
        return <Skeleton className="h-4 w-28 inline-block" />;
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

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return `$ ${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


export function EnvioDetailDialog({ envioId, isOpen, onOpenChange }: EnvioDetailDialogProps) {
  const [envio, setEnvio] = useState<EnvioCompletoParaDialog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && envioId) {
      const fetchEnvioDetails = async () => {
        setIsLoading(true);
        setError(null);
        setEnvio(null); 
        try {
          const result = await getEnvioByIdAction(envioId);
          if (result.data) {
            setEnvio(result.data);
          } else {
            setError(result.error || "No se pudo cargar el envío.");
            toast({ title: "Error", description: result.error || "No se pudo cargar el envío.", variant: "destructive" });
          }
        } catch (e) {
          const err = e as Error;
          setError("Error inesperado al cargar el envío.");
          toast({ title: "Error Inesperado", description: err.message, variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchEnvioDetails();
    } else if (!isOpen) {
        setEnvio(null); 
    }
  }, [isOpen, envioId, toast]);

  const renderDetailRow = (icon: React.ReactNode, label: string, value: React.ReactNode | string | number | null | undefined, valueClassName?: string) => {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }
    return (
      <TableRow className="hover:bg-muted/10">
        <TableCell className="font-medium w-[180px] flex items-center text-muted-foreground py-2.5">
          {icon}
          <span className="ml-2">{label}</span>
        </TableCell>
        <TableCell className={cn("py-2.5", valueClassName)}>{value}</TableCell>
      </TableRow>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl">Detalle del Envío</DialogTitle>
          {isLoading && <DialogDescription>Cargando detalles...</DialogDescription>}
          {error && <DialogDescription className="text-destructive">Error: {error}</DialogDescription>}
          {envio && <DialogDescription>ID: <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{envio.id}</span></DialogDescription>}
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center items-center py-10 flex-grow">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-10 text-center flex-grow px-6">
            <AlertTriangle className="h-12 w-12 text-destructive mb-3" />
            <p className="text-lg font-semibold text-destructive">No se pudieron cargar los detalles</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {!isLoading && !error && envio && (
          <div className="overflow-y-auto flex-grow px-6 pb-6 space-y-4">
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Info className="h-5 w-5 text-primary" />Información Principal</CardTitle></CardHeader>
              <CardContent className="pt-0"><Table><TableBody>
                    {renderDetailRow(<Info className="h-4 w-4" />, "Estado", <Badge className={`${getEstadoEnvioBadgeColor(envio.status)} capitalize px-2 py-1 text-xs`}>{envio.status ? envio.status.replace(/_/g, ' ') : 'Desconocido'}</Badge>)}
                    {renderDetailRow(<CalendarDays className="h-4 w-4" />, "Fecha de Creación", <ClientSideFormattedDate dateString={envio.created_at} />)}
              </TableBody></Table></CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base flex items-center gap-2">{envio.clientes ? <User className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-muted-foreground"/>}{envio.clientes ? "Cliente Asociado" : "Destinatario Temporal"}</CardTitle></CardHeader>
              <CardContent className="pt-0"><Table><TableBody>
                    {envio.clientes ? (
                        <>
                            {renderDetailRow(<User className="h-4 w-4" />, "Nombre", `${envio.clientes.nombre} ${envio.clientes.apellido}`)}
                            {renderDetailRow(<MapPin className="h-4 w-4" />, "Dirección", envio.clientes.direccion)}
                            {renderDetailRow(<Mail className="h-4 w-4" />, "Email", envio.clientes.email)}
                            {renderDetailRow(<Phone className="h-4 w-4" />, "Teléfono", envio.clientes.telefono)}
                        </>
                    ) : (
                        <>
                            {renderDetailRow(<User className="h-4 w-4" />, "Nombre Temporal", envio.nombre_cliente_temporal)}
                            {renderDetailRow(<MapPin className="h-4 w-4" />, "Ubicación", envio.client_location)}
                        </>
                    )}
              </TableBody></Table></CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BoxIcon className="h-5 w-5 text-primary" />Detalles del Paquete</CardTitle></CardHeader>
              <CardContent className="pt-0"><Table><TableBody>
                        {renderDetailRow(<BoxIcon className="h-4 w-4" />, "Tipo de Paquete", envio.tipos_paquete?.nombre || "No especificado")}
                        {renderDetailRow(<Weight className="h-4 w-4" />, "Peso", `${envio.package_weight || '-'} kg`)}
              </TableBody></Table></CardContent>
            </Card>
            
            {(envio.tipo_servicio_id || envio.precio_servicio_final !== null) && (
                <Card className="shadow-sm">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Servicio y Precio</CardTitle></CardHeader>
                    <CardContent className="pt-0"><Table><TableBody>
                        {renderDetailRow(<Info className="h-4 w-4" />, "Tipo de Servicio", envio.tipos_servicio?.nombre)}
                        {renderDetailRow(<DollarSign className="h-4 w-4" />, "Precio Final", formatCurrency(envio.precio_servicio_final), "font-semibold")}
                    </TableBody></Table></CardContent>
                </Card>
            )}

            {envio.reparto_id && envio.repartos && (
              <Card className="shadow-sm">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-5 w-5 text-primary" />Asignado a Reparto</CardTitle></CardHeader>
                <CardContent className="pt-0"><Table><TableBody>
                    {renderDetailRow(<Hash className="h-4 w-4" />, "ID Reparto", <Button variant="link" asChild className="p-0 h-auto text-primary hover:underline"><Link href={`/repartos/${envio.reparto_id}`}>{envio.reparto_id}</Link></Button>)}
                    {renderDetailRow(<CalendarDays className="h-4 w-4" />, "Fecha Reparto", <ClientSideFormattedDate dateString={envio.repartos.fecha_reparto} formatString="PPP" />)}
                    {renderDetailRow(<User className="h-4 w-4" />, "Repartidor", envio.repartos.repartidores?.nombre)}
                </TableBody></Table></CardContent>
              </Card>
            )}

            {(envio.suggested_options || envio.reasoning) && (
                <Card className="shadow-sm">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-5 w-5 text-yellow-400" />Sugerencias de IA</CardTitle></CardHeader>
                    <CardContent className="pt-0"><Accordion type="single" collapsible className="w-full">
                        {envio.suggested_options && Array.isArray(envio.suggested_options) && (envio.suggested_options as string[]).length > 0 && (
                            <AccordionItem value="options"><AccordionTrigger>Opciones Sugeridas</AccordionTrigger><AccordionContent><ul className="list-disc pl-5 space-y-1 text-sm">{(envio.suggested_options as string[]).map((opt, idx) => <li key={idx}>{opt}</li>)}</ul></AccordionContent></AccordionItem>
                        )}
                         {envio.reasoning && (
                            <AccordionItem value="reasoning"><AccordionTrigger>Razonamiento</AccordionTrigger><AccordionContent className="text-sm whitespace-pre-wrap">{envio.reasoning}</AccordionContent></AccordionItem>
                        )}
                    </Accordion></CardContent>
                </Card>
            )}
            
            {!envio.reparto_id && !envio.tipo_servicio_id && !envio.suggested_options && !envio.reasoning && (
                 <Card className="shadow-sm"><CardHeader><CardTitle className="text-base flex items-center gap-2"><HelpCircle className="h-5 w-5 text-muted-foreground"/>Información Adicional</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-muted-foreground">No hay más detalles adicionales para este envío.</p></CardContent></Card>
            )}
          </div>
        )}
        <div className="p-6 pt-4 border-t mt-auto">
            <DialogClose asChild><Button type="button" variant="outline" className="w-full">Cerrar</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
