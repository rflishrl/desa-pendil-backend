"use client";

import { Trash2Icon } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteDialogProps {
  itemName: string;
  /** Deletion callback; throwing an error surfaces the failure message in the dialog. */
  onConfirm: () => Promise<unknown>;
}

/** Delete action trigger and confirmation modal dialog. */
export function DeleteDialog({ itemName, onConfirm }: DeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  async function confirm() {
    setDeleting(true);
    setError(undefined);
    try {
      await onConfirm();
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menghapus. Coba lagi.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (deleting) return;
        setOpen(next);
        if (next) setError(undefined);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="lg"
          className="h-11 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Hapus ${itemName}`}
        >
          <Trash2Icon aria-hidden="true" />
          <span className="hidden sm:inline">Hapus</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus &ldquo;{itemName}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            Data dan fotonya akan dihapus permanen dan tidak bisa dikembalikan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} className="h-11">
            Batal
          </AlertDialogCancel>
          {/* Bukan AlertDialogAction: dialog baru ditutup setelah penghapusan berhasil. */}
          <Button
            variant="destructive"
            className="h-11 bg-destructive text-white hover:bg-destructive/90"
            onClick={confirm}
            disabled={deleting}
          >
            {deleting ? "Menghapus..." : "Ya, hapus"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
