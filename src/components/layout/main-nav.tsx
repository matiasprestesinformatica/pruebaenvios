
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, PackageSearch, Bike, Building2, Route, Warehouse, MapPin, Settings, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/envios", label: "Envíos", icon: PackageSearch },
  { href: "/repartidores", label: "Repartidores", icon: Bike },
  { href: "/repartos", label: "Repartos", icon: Route },
  { href: "/repartos/lote/nuevo", label: "Repartos Lote", icon: Warehouse },
  { href: "/mapa-envios", label: "Mapa Envíos", icon: MapPin },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

const cotizadorNavItems = [
  { href: "/cotizador-envios-express", label: "Cotizador Express" },
  { href: "/cotizador-envios-lowcost", label: "Cotizador Low Cost" },
];


interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  onItemClick?: () => void;
  direction?: "horizontal" | "vertical";
}

export function MainNav({ className, onItemClick, direction = "horizontal", ...props }: MainNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={cn(
        "flex",
        direction === "horizontal" ? "flex-row items-center space-x-1 lg:space-x-2" : "flex-col space-y-1",
        className
      )}
      {...props}
    >
      {navItems.map((item) => (
        <Button
          key={item.href}
          asChild
          variant="ghost"
          size={direction === "horizontal" ? "sm" : "default"}
          className={cn(
            "justify-start text-base font-medium",
            isActive(item.href)
              ? "bg-accent text-accent-foreground hover:bg-accent/90"
              : "hover:bg-accent/80 hover:text-accent-foreground",
            direction === "horizontal" ? "px-3 py-2" : "w-full px-3 py-2 text-left"
          )}
          onClick={onItemClick}
        >
          <Link href={item.href} className="flex items-center gap-2">
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        </Button>
      ))}
      {/* Cotizador Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={direction === "horizontal" ? "sm" : "default"}
            className={cn(
              "justify-start text-base font-medium",
               cotizadorNavItems.some(item => isActive(item.href))
                ? "bg-accent text-accent-foreground hover:bg-accent/90"
                : "hover:bg-accent/80 hover:text-accent-foreground",
              direction === "horizontal" ? "px-3 py-2" : "w-full px-3 py-2 text-left"
            )}
          >
            <Calculator className="h-5 w-5 mr-2" />
            <span>Cotizadores</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={direction === "horizontal" ? "start" : "end"} className="w-56">
          {cotizadorNavItems.map((item) => (
            <DropdownMenuItem key={item.href} asChild onClick={onItemClick}
              className={cn(isActive(item.href) ? "bg-accent/50" : "")}
            >
              <Link href={item.href}>{item.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
