import {
  deleteMediaObjectsByKeys,
  listOrphanCandidateMediaObjects,
  listReferencedImageUrls,
} from "@/features/uploads/repository";
import { AppError } from "@/lib/api/errors";
import { purgeExpiredRateLimits } from "@/lib/api/rate-limit";
import { safeEqual } from "@/lib/crypto";
import { getServerEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { deleteOrphanImages } from "@/lib/storage/blob";
import { comparableMediaRef, isValidMediaKey } from "@/lib/storage/media-key";
import { deriveThumbKey } from "@/lib/storage/media-url";
import { getR2Storage } from "@/lib/storage/provider";

/** Preserves recent uploads to prevent deleting files from active form sessions. */
export const MIN_ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

export interface MediaCleanupResult {
  scanned: number;
  deleted: number;
  r2: { scanned: number; deleted: number };
  blob: { scanned: number; deleted: number };
  purgedRateLimits: number;
}

function collectReferencedKeys(refs: ReadonlySet<string>): Set<string> {
  const keys = new Set<string>();
  for (const ref of refs) {
    const token = comparableMediaRef(ref);
    if (isValidMediaKey(token)) {
      keys.add(token);
    }
  }
  return keys;
}

async function cleanupOrphanR2Media(
  referencedKeys: ReadonlySet<string>,
  olderThan: Date,
): Promise<{ scanned: number; deleted: number }> {
  const env = getServerEnv();
  const hasR2Creds = Boolean(
    env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ENDPOINT && env.R2_BUCKET_NAME,
  );
  if (!hasR2Creds) {
    return { scanned: 0, deleted: 0 };
  }

  const candidates = await listOrphanCandidateMediaObjects(olderThan);
  const orphans = candidates.filter((row) => !referencedKeys.has(row.key));
  if (orphans.length === 0) {
    return { scanned: candidates.length, deleted: 0 };
  }

  const storage = getR2Storage();
  const keysToDelete: string[] = [];
  for (const orphan of orphans) {
    keysToDelete.push(orphan.key, deriveThumbKey(orphan.key));
  }

  const result = await storage.deleteObjects(keysToDelete);
  const deletedSet = new Set(result.deleted);
  const successfullyDeletedFullKeys = orphans
    .filter((orphan) => deletedSet.has(orphan.key) && deletedSet.has(deriveThumbKey(orphan.key)))
    .map((orphan) => orphan.key);

  const dbDeletedCount = await deleteMediaObjectsByKeys(successfullyDeletedFullKeys);

  return {
    scanned: candidates.length,
    deleted: dbDeletedCount,
  };
}

/**
 * Cleans up orphaned media (R2 pairs tracked in Neon `media_objects` without `ListObjectsV2`,
 * legacy Vercel Blobs during transition) and expired rate limits via Vercel Cron.
 * Validates `Authorization: Bearer <CRON_SECRET>` with constant-time equality check.
 */
export async function cleanupOrphanMedia(
  authorization: string | null,
): Promise<MediaCleanupResult> {
  const env = getServerEnv();
  const secret = env.CRON_SECRET;
  if (!secret) throw new AppError("UNAVAILABLE", "CRON_SECRET belum diisi.");
  if (!safeEqual(authorization ?? "", `Bearer ${secret}`)) {
    throw new AppError("UNAUTHENTICATED", "Tidak diizinkan.");
  }

  const purgedRateLimits = await purgeExpiredRateLimits();
  const olderThan = new Date(Date.now() - MIN_ORPHAN_AGE_MS);
  const referenced = await listReferencedImageUrls();
  const referencedKeys = collectReferencedKeys(referenced);

  const r2Result =
    env.STORAGE_PROVIDER === "r2" ||
    (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ENDPOINT && env.R2_BUCKET_NAME)
      ? await cleanupOrphanR2Media(referencedKeys, olderThan)
      : { scanned: 0, deleted: 0 };

  let blobResult = { scanned: 0, deleted: 0 };
  if (env.STORAGE_PROVIDER === "blob" || env.BLOB_READ_WRITE_TOKEN) {
    blobResult = await deleteOrphanImages(referenced, olderThan);
  }

  const result: MediaCleanupResult = {
    scanned: r2Result.scanned + blobResult.scanned,
    deleted: r2Result.deleted + blobResult.deleted,
    r2: r2Result,
    blob: blobResult,
    purgedRateLimits,
  };

  log("info", "pembersihan media dan rate limit selesai", { ...result });
  return result;
}

/** Backward-compatible alias for `/api/cron/cleanup-blobs`. */
export const cleanupOrphanImages = cleanupOrphanMedia;
