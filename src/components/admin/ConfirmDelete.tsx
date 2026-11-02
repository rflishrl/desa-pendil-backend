"use client";

import { useRef } from "react";
import { btn } from "@/components/admin/ui";

/** Native <dialog> confirmation (focus trap + Esc come for free). */
export function ConfirmDelete({
  action,
  id,
  itemName,
  description = "Tindakan ini tidak bisa dibatalkan.",
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  itemName: string;
  description?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label={`Hapus ${itemName}`}
        className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm font-semibold text-danger transition-colors hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
      >
        Hapus
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`del-${id}`}
        className="w-[min(92vw,26rem)] rounded-2xl p-6 shadow-card backdrop:bg-black/40"
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <h2 id={`del-${id}`} className="text-lg font-bold">
            Hapus “{itemName}”?
          </h2>
          <p className="text-muted">{description}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className={btn.secondary}>
              Batal
            </button>
            <button type="submit" className={btn.danger}>
              Ya, hapus
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
