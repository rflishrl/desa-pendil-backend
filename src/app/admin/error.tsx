"use client";

import { AlertCircleIcon } from "lucide-react";
import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Digest matches the server log entry.
    console.error("[admin]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertTitle>Data tidak dapat dimuat</AlertTitle>
        <AlertDescription>
          Pastikan variabel <code>DATABASE_URI</code> di <code>.env.local</code> sudah benar dan
          database Neon dapat dijangkau.
          {error.digest && <span className="block">Kode: {error.digest}</span>}
        </AlertDescription>
      </Alert>
      <Button size="lg" className="h-11 px-4" onClick={reset}>
        Coba lagi
      </Button>
    </div>
  );
}
