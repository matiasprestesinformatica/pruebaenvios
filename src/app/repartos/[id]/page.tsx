
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface RepartoDetailPageProps {
  params: {
    id: string;
  };
}

export default async function RepartoDetailPage({ params }: RepartoDetailPageProps) {
  // TODO: Fetch reparto details using params.id with getRepartoDetailsAction
  // For now, just a placeholder
  const repartoId = params.id;

  return (
    <>
      <PageHeader
        title={`Detalle del Reparto #${repartoId.substring(0,8)}...`}
        description="Vea y administre los detalles y el estado de este reparto."
        actions={
          <Button asChild variant="outline">
            <Link href="/repartos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Repartos
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] border-2 border-dashed border-muted-foreground/30 rounded-lg bg-card shadow p-8">
        <Package className="w-24 h-24 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-muted-foreground mb-2">Detalles del Reparto</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Esta sección mostrará la información completa del reparto, incluyendo los envíos asignados y permitirá actualizar su estado.
        </p>
        <p className="text-sm text-muted-foreground mt-2">(Funcionalidad en desarrollo)</p>
      </div>
    </>
  );
}

function Package(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    )
  }

export const dynamic = 'force-dynamic';
