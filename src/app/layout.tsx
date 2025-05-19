
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { TopNavbar } from "@/components/layout/top-navbar";

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
        <div className="flex flex-col min-h-screen">
          <TopNavbar />
          <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8 bg-background">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
