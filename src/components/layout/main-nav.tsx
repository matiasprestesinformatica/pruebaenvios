
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, PackageSearch, Bike, Building2, Route, Warehouse } from "lucide-react"; // Added Warehouse icon
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/envios", label: "Envíos", icon: PackageSearch },
  { href: "/repartidores", label: "Repartidores", icon: Bike },
  { href: "/repartos", label: "Repartos", icon: Route },
  { href: "/repartos/lote/nuevo", label: "Repartos Lote", icon: Warehouse }, // New Item
];

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  onItemClick?: () => void;
  direction?: "horizontal" | "vertical";
}

export function MainNav({ className, onItemClick, direction = "horizontal", ...props }: MainNavProps) {
  const pathname = usePathname();

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
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) // More robust active check
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
    </nav>
  );
}
```