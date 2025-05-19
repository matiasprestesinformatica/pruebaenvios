
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

export default function EnviosPage() {
  return (
    <>
      <PageHeader
        title="Gestión de Envíos"
        description="Cree y administre sus envíos."
        actions={
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/envios/nuevo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Envío
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] border-2 border-dashed border-muted-foreground/30 rounded-lg bg-card shadow">
        <PackageSearchIcon className="w-24 h-24 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-muted-foreground mb-2">No hay envíos registrados</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Comience creando un nuevo envío para sus clientes. Podrá optimizar rutas y ver sugerencias de entrega.
        </p>
      </div>
    </>
  );
}

function PackageSearchIcon(props: React.SVGProps<SVGSVGElement>) {
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
        <path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4" />
        <path d="M21 10v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M14 10h4" />
        <path d="M14 14h4" />
        <path d="M5 10h4" />
        <path d="M5 14h4" />
        <path d="M12 4v16" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
