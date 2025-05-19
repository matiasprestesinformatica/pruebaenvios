
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
