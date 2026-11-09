import "server-only";

import { listReferencedImageUrls } from "@/features/uploads/repository";
import { AppError } from "@/lib/api/errors";
import { safeEqual } from "@/lib/crypto";
import { getServerEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { deleteOrphanImages } from "@/lib/storage/blob";

/** Preserves recent uploads to prevent deleting files from active form sessions. */
const MIN_ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Cleans up orphaned uploads via Vercel Cron.
 * Validates `Authorization: Bearer <CRON_SECRET>` with constant-time equality check.
 */
export async function cleanupOrphanImages(
  authorization: string | null,
): Promise<{ scanned: number; deleted: number }> {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret) throw new AppError("UNAVAILABLE", "CRON_SECRET belum diisi.");
  if (!safeEqual(authorization ?? "", `Bearer ${secret}`)) {
    throw new AppError("UNAUTHENTICATED", "Tidak diizinkan.");
  }

  const referenced = await listReferencedImageUrls();
  const result = await deleteOrphanImages(referenced, new Date(Date.now() - MIN_ORPHAN_AGE_MS));
  log("info", "pembersihan foto selesai", result);
  return result;
}
