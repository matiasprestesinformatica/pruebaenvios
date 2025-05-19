
"use client";

import Link from "next/link";
import { Package, Menu } from "lucide-react";
import { MainNav } from "./main-nav";
import { UserNav } from "./user-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TopNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-6 w-24 hidden sm:block" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-20 hidden md:block" />
            <Skeleton className="h-8 w-20 hidden md:block" />
            <Skeleton className="h-8 w-8 rounded-full hidden md:block" />
            <Skeleton className="h-8 w-8 md:hidden" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo/Brand */}
        <Link href="/clientes" className="flex items-center gap-2 text-lg font-semibold text-primary">
          <Package className="h-7 w-7 transition-all group-hover:scale-110" />
          <span className="hidden sm:inline-block">Rumbos Envios</span>
        </Link>

        {/* Desktop Navigation & User Nav */}
        <div className="hidden md:flex md:items-center md:gap-6">
          <MainNav direction="horizontal" />
          <UserNav />
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-3/4 sm:w-1/2 bg-card p-6 flex flex-col">
              <SheetClose asChild>
                <Link href="/clientes" className="flex items-center gap-2 text-lg font-semibold text-primary mb-6" onClick={() => setIsMobileMenuOpen(false)}>
                  <Package className="h-7 w-7" />
                  <span>Rumbos Envios</span>
                </Link>
              </SheetClose>
              <MainNav direction="vertical" onItemClick={() => setIsMobileMenuOpen(false)} />
              <div className="mt-auto pt-6 border-t">
                <UserNav />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
