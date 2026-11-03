"use client";

import { AlertCircleIcon } from "lucide-react";
import { useEffect } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="font-heading text-2xl font-bold">Terjadi kesalahan</h1>
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertDescription>
          Halaman tidak dapat dimuat. Jika Anda baru memasang proyek ini,
          pastikan file <code>.env.local</code> sudah diisi lengkap (lihat
          README).
        </AlertDescription>
      </Alert>
      <Button size="lg" className="h-11 self-start px-4" onClick={reset}>
        Coba lagi
      </Button>
    </main>
  );
}
