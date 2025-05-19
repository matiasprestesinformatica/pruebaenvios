
import { PageHeader } from "@/components/page-header";
import { AddClientDialog } from "@/components/add-client-dialog";
import { ClientsTable } from "@/components/clients-table";
import { addClientAction, getClientsAction } from "./actions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientesPageProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

async function ClientsData({ currentPage, searchTerm }: { currentPage: number; searchTerm?: string }) {
  const { data: clients, count, error } = await getClientsAction(currentPage, 10, searchTerm);

  if (error) {
    return <p className="text-destructive">Error al cargar clientes: {error}</p>;
  }

  return <ClientsTable initialClients={clients} initialTotalCount={count} initialPage={currentPage} />;
}

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const searchTerm = searchParams?.search || undefined;

  // Callback for AddClientDialog to revalidate/refresh data
  // This is tricky with server components. Revalidation is handled by server action.
  // For immediate UI update, client-side state management or optimistic updates would be needed,
  // but revalidatePath in action should suffice for now.
  const handleClientAdded = async () => {
    // Revalidation is done by the server action.
    // This function could be used for client-side optimistic updates if needed.
  };

  return (
    <>
      <PageHeader
        title="Gestión de Clientes"
        description="Agregue, vea y administre los datos de sus clientes."
        actions={<AddClientDialog onClientAdded={handleClientAdded} addClientAction={addClientAction} />}
      />
      <Suspense fallback={<ClientsTableSkeleton />}>
        <ClientsData currentPage={currentPage} searchTerm={searchTerm} />
      </Suspense>
    </>
  );
}

function ClientsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-96 w-full rounded-md" />
      <div className="flex items-center justify-between pt-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request
