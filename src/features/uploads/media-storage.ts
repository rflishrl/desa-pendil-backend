import { deleteMediaObjectByKey } from "@/features/uploads/repository";
import { log } from "@/lib/log";
import { deleteImage as deleteBlobImage } from "@/lib/storage/blob";
import {
  deriveThumbKey,
  extractCanonicalKeyFromHttpsUrl,
  isLegacyBlobUrl,
  isValidMediaKey,
} from "@/lib/storage/media-url";
import { getR2Storage } from "@/lib/storage/provider";

function resolveDeletableR2Key(keyOrUrl: string): string | null {
  if (isValidMediaKey(keyOrUrl)) return keyOrUrl;
  const extracted = extractCanonicalKeyFromHttpsUrl(keyOrUrl);
  if (!extracted) return null;

  const configuredDomain = process.env.R2_PUBLIC_DOMAIN?.trim();
  if (!configuredDomain) return null;
  try {
    if (new URL(configuredDomain).origin !== extracted.origin) return null;
  } catch {
    return null;
  }
  return extracted.key;
}

/**
 * Deletes an old image from either Vercel Blob (legacy URL) or Cloudflare R2 (`full + thumb`
 * pair and `media_objects` row). Failures are non-fatal and logged.
 */
export async function deleteStoredMedia(keyOrUrl: string | null | undefined): Promise<void> {
  if (!keyOrUrl) return;

  if (isLegacyBlobUrl(keyOrUrl)) {
    await deleteBlobImage(keyOrUrl);
    return;
  }

  const r2Key = resolveDeletableR2Key(keyOrUrl);
  if (!r2Key) return;

  try {
    const storage = getR2Storage();
    const thumbKey = deriveThumbKey(r2Key);
    const result = await storage.deleteObjects([r2Key, thumbKey]);
    for (const failure of result.failed) {
      log("error", "gagal menghapus objek R2", {
        key: failure.key,
        reason: failure.message,
      });
    }
    await deleteMediaObjectByKey(r2Key);
  } catch (error) {
    log("error", "gagal menghapus media R2 lama", { key: r2Key, error });
  }
}
