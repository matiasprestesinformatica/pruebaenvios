
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/clientes');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Skeleton className="h-12 w-1/2 mb-4" />
      <Skeleton className="h-8 w-1/3 mb-2" />
      <Skeleton className="h-8 w-1/3" />
      <p className="mt-4 text-muted-foreground">Redirigiendo...</p>
    </div>
  );
}
