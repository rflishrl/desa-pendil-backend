"use client";

import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCheckRevalidate } from "@/features/revalidate/hooks";
import type { RevalidateStatus } from "@/features/revalidate/types";

/**
 * Menunjukkan pengaturan penyegaran situs publik dan menguji jalurnya dari backend ke frontend.
 * Nilai rahasia tidak pernah sampai di sini; hanya "terisi" atau "belum diisi".
 */
export function RevalidateCard({ status }: { status: RevalidateStatus }) {
  const check = useCheckRevalidate();

  return (
    <div className="rounded-lg bg-card p-5 shadow-card">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">Alamat situs publik (FRONTEND_URL)</dt>
          <dd className="mt-0.5 break-all text-muted-foreground">
            {status.frontendUrl ?? (
              <span className="font-medium text-destructive">belum diisi</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Rahasia (REVALIDATE_SECRET)</dt>
          <dd className="mt-0.5 text-muted-foreground">
            {status.hasSecret ? (
              "terisi"
            ) : (
              <span className="font-medium text-destructive">belum diisi</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-11 px-4"
          disabled={check.isPending}
          onClick={() => check.mutate()}
        >
          {check.isPending ? "Menguji..." : "Uji penyegaran"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Memanggil situs publik dari server ini, persis seperti saat Anda
          menyimpan atau menghapus data.
        </p>
      </div>

      <div aria-live="polite" className="mt-4 empty:hidden">
        {check.data && (
          <Alert
            variant={check.data.state === "ok" ? "default" : "destructive"}
          >
            {check.data.state === "ok" ? (
              <CheckCircle2Icon aria-hidden="true" />
            ) : (
              <AlertCircleIcon aria-hidden="true" />
            )}
            <AlertDescription>{check.data.message}</AlertDescription>
          </Alert>
        )}
        {check.error && (
          <Alert variant="destructive">
            <AlertCircleIcon aria-hidden="true" />
            <AlertDescription>{check.error.message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
