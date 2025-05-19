
import type {Metadata} from 'next';
// Removed: import { Geist_Sans } from 'geist/font/sans';
// Removed: import { Geist_Mono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Removed:
// const geistSans = Geist_Sans({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// });

// Removed:
// const geistMono = Geist_Mono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

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
      <body className={`antialiased font-sans`}>
        {/* Removed geistSans.variable from className */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
