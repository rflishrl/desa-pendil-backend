import "server-only";

import { listReferencedImageUrls } from "@/features/uploads/repository";
import { AppError } from "@/lib/api/errors";
import { safeEqual } from "@/lib/crypto";
import { getServerEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { deleteOrphanImages } from "@/lib/storage/blob";
import { createAdminClient } from "@/lib/supabase/admin";

/** Foto yang lebih muda dari ini tidak disentuh (mungkin form-nya masih diisi). */
const MIN_ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Pembersihan foto yatim oleh Vercel Cron. Otorisasinya: header
 * `Authorization: Bearer <CRON_SECRET>` (dikirim otomatis oleh Vercel), dibandingkan
 * dalam waktu tetap. CRON_SECRET kosong = fitur mati (503).
 */
export async function cleanupOrphanImages(
  authorization: string | null,
): Promise<{ scanned: number; deleted: number }> {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret) throw new AppError("UNAVAILABLE", "CRON_SECRET belum diisi.");
  if (!safeEqual(authorization ?? "", `Bearer ${secret}`)) {
    throw new AppError("UNAUTHENTICATED", "Tidak diizinkan.");
  }

  const referenced = await listReferencedImageUrls(createAdminClient());
  const result = await deleteOrphanImages(
    referenced,
    new Date(Date.now() - MIN_ORPHAN_AGE_MS),
  );
  log("info", "pembersihan foto selesai", result);
  return result;
}
