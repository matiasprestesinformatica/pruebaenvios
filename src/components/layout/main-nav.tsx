
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/envios", label: "Envíos", icon: PackageSearch },
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
            pathname.startsWith(item.href)
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
