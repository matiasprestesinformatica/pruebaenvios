
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

import { AddTipoPaqueteDialog } from "@/components/configuracion/add-tipo-paquete-dialog";
import { TiposPaqueteTable } from "@/components/configuracion/tipos-paquete-table";
import { AddTipoServicioDialog } from "@/components/configuracion/add-tipo-servicio-dialog";
import { TiposServicioTable } from "@/components/configuracion/tipos-servicio-table";

import { 
    addTipoPaqueteAction, 
    getTiposPaqueteAction,
    updateTipoPaqueteEstadoAction,
    getTipoPaqueteByIdAction,
    updateTipoPaqueteAction,
    addTipoServicioAction,
    getTiposServicioAction,
    updateTipoServicioEstadoAction,
    getTipoServicioByIdAction,
    updateTipoServicioAction
} from "./actions"; 

interface ConfiguracionPageSearchParams {
    pageTiposPaquete?: string;
    searchTiposPaquete?: string;
    pageTiposServicio?: string;
    searchTiposServicio?: string;
}

interface ConfiguracionPageProps {
    searchParams: ConfiguracionPageSearchParams;
}

async function TiposPaqueteSection({ searchParams }: { searchParams: ConfiguracionPageSearchParams }) {
  const currentPage = Number(searchParams?.pageTiposPaquete) || 1;
  const searchTerm = searchParams?.searchTiposPaquete || undefined;
  const { data, count, error } = await getTiposPaqueteAction(currentPage, 10, searchTerm);

  if (error) {
    return <p className="text-destructive mt-4">Error al cargar tipos de paquete: {error}</p>;
  }

  return (
    <div className="space-y-6 mt-4">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Gestión de Tipos de Paquete</h2>
            <AddTipoPaqueteDialog addTipoPaqueteAction={addTipoPaqueteAction} />
        </div>
        <TiposPaqueteTable 
            initialData={data} 
            initialTotalCount={count} 
            initialPage={currentPage}
            onUpdateEstado={updateTipoPaqueteEstadoAction}
            onGetById={getTipoPaqueteByIdAction}
            onUpdate={updateTipoPaqueteAction}
        />
    </div>
  );
}

async function TiposServicioSection({ searchParams }: { searchParams: ConfiguracionPageSearchParams }) {
  const currentPage = Number(searchParams?.pageTiposServicio) || 1;
  const searchTerm = searchParams?.searchTiposServicio || undefined;
  const { data, count, error } = await getTiposServicioAction(currentPage, 10, searchTerm);

  if (error) {
    return <p className="text-destructive mt-4">Error al cargar tipos de servicio: {error}</p>;
  }
  
  return (
    <div className="space-y-6 mt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Gestión de Tipos de Servicio</h2>
         <AddTipoServicioDialog addTipoServicioAction={addTipoServicioAction} />
      </div>
       <TiposServicioTable
            initialData={data}
            initialTotalCount={count}
            initialPage={currentPage}
            onUpdateEstado={updateTipoServicioEstadoAction}
            onGetById={getTipoServicioByIdAction}
            onUpdate={updateTipoServicioAction}
       />
    </div>
  );
}


export default async function ConfiguracionPage({ searchParams }: ConfiguracionPageProps ) {
  return (
    <>
      <PageHeader
        title="Configuración General"
        description="Administre los tipos de paquetes y servicios ofrecidos."
      />
      <Tabs defaultValue="tipos-paquete" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="tipos-paquete">Tipos de Paquete</TabsTrigger>
          <TabsTrigger value="tipos-servicio">Tipos de Servicio</TabsTrigger>
        </TabsList>
        <TabsContent value="tipos-paquete">
          <Suspense fallback={<Skeleton className="h-[400px] w-full mt-4" />}>
            <TiposPaqueteSection searchParams={searchParams} />
          </Suspense>
        </TabsContent>
        <TabsContent value="tipos-servicio">
          <Suspense fallback={<Skeleton className="h-[400px] w-full mt-4" />}>
            <TiposServicioSection searchParams={searchParams} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </>
  );
}

export const dynamic = 'force-dynamic';
    
    