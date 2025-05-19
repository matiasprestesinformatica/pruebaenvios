
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { MainNav } from "@/components/layout/main-nav";
import { UserNav } from "@/components/layout/user-nav";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: 'Rumbos Envios',
  description: 'Gestión de clientes y envíos para Rumbos Envios.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased font-sans">
        <SidebarProvider defaultOpen>
          <Sidebar>
            <SidebarHeader className="p-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" className="h-auto p-0 hover:bg-transparent group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center" asChild>
                    <Link href="/clientes" className="flex items-center gap-2 text-lg font-semibold text-primary">
                        <Package className="h-7 w-7 transition-all group-hover:scale-110" />
                        <span className="group-data-[collapsible=icon]:hidden">Rumbos Envios</span>
                    </Link>
                </Button>
                <div className="group-data-[collapsible=icon]:hidden">
                  <SidebarTrigger />
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <MainNav />
            </SidebarContent>
            <SidebarFooter>
              <UserNav />
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background min-h-screen">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
