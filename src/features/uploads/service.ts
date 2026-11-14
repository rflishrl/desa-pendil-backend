import { processImagePipeline } from "@/features/uploads/image-pipeline";
import { getMediaUsageSummary, insertMediaObject } from "@/features/uploads/repository";
import { type UploadResult, uploadFormSchema } from "@/features/uploads/schemas";
import { AppError } from "@/lib/api/errors";
import type { Actor } from "@/lib/auth/actor";
import { assertAdmin } from "@/lib/auth/authorize";
import { getServerEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { UPLOAD_PREFIX, uploadImage } from "@/lib/storage/blob";
import {
  deriveThumbKey,
  generateMediaKey,
  getPublicMediaUrl,
  getPublicThumbUrl,
  IMMUTABLE_CACHE_CONTROL,
} from "@/lib/storage/media-url";
import { getR2Storage, getStorageProviderKind } from "@/lib/storage/provider";

const BYTES_PER_MIB = 1024 * 1024;

async function rollbackObjects(keys: string[]): Promise<void> {
  try {
    const storage = getR2Storage();
    const result = await storage.deleteObjects(keys);
    if (result.failed.length > 0) {
      log("error", "rollback sebagian objek R2 gagal", {
        failed: result.failed,
      });
    }
  } catch (error) {
    log("error", "rollback objek R2 gagal", { keys, error });
  }
}

/**
 * Uploads a single image file using the configured storage provider (`blob` or `r2`).
 * In `r2` mode, processes the image with `Bun.Image` into `full` and `thumb` WebP variants,
 * enforces app quota, uploads both objects with atomic rollback on failure, and tracks in DB.
 */
export async function uploadPhoto(
  actor: Actor | null,
  form: FormData,
  requestId?: string,
): Promise<UploadResult> {
  assertAdmin(actor);
  const { folder, file } = uploadFormSchema.parse({
    folder: form.get("folder"),
    file: form.get("file"),
  });

  const env = getServerEnv();
  const maxBytes = env.MAX_UPLOAD_MB * BYTES_PER_MIB;
  if (file.size === 0) {
    throw new AppError("BAD_REQUEST", "File foto tidak boleh kosong.");
  }
  if (file.size > maxBytes) {
    throw new AppError("PAYLOAD_TOO_LARGE", `Ukuran foto maksimal ${env.MAX_UPLOAD_MB} MB.`);
  }

  if (getStorageProviderKind() === "blob") {
    const url = await uploadImage(file, `${UPLOAD_PREFIX}${folder}`);
    return { url, thumbUrl: url };
  }

  const inputBytes = new Uint8Array(await file.arrayBuffer());
  const processed = await processImagePipeline(inputBytes, {
    declaredMimeType: file.type,
  });

  const quotaBytes = env.R2_APP_QUOTA_MB * BYTES_PER_MIB;
  const usage = await getMediaUsageSummary();
  const currentUsed = usage.totalBytes + usage.totalThumbBytes;
  if (currentUsed + processed.totalCompressedSize > quotaBytes) {
    throw new AppError(
      "PAYLOAD_TOO_LARGE",
      "Kuota penyimpanan media R2 aplikasi penuh. Hapus media lama terlebih dahulu.",
    );
  }

  const key = generateMediaKey();
  const thumbKey = deriveThumbKey(key);
  const storage = getR2Storage();

  await storage.putObject({
    key,
    body: processed.fullBuffer,
    contentType: "image/webp",
    cacheControl: IMMUTABLE_CACHE_CONTROL,
  });

  try {
    await storage.putObject({
      key: thumbKey,
      body: processed.thumbBuffer,
      contentType: "image/webp",
      cacheControl: IMMUTABLE_CACHE_CONTROL,
    });
  } catch (error) {
    await rollbackObjects([key]);
    throw error;
  }

  try {
    await insertMediaObject({
      key,
      folder,
      sizeBytes: processed.fullSize,
      thumbSizeBytes: processed.thumbSize,
      contentType: "image/webp",
      width: processed.width,
      height: processed.height,
    });
  } catch (error) {
    await rollbackObjects([key, thumbKey]);
    throw error;
  }

  log("info", "foto berhasil diunggah ke r2", {
    requestId,
    folder,
    key,
    originalSize: processed.originalSize,
    fullSize: processed.fullSize,
    thumbSize: processed.thumbSize,
    savedPercent: processed.savedPercent,
  });

  return {
    key,
    url: getPublicMediaUrl(key),
    thumbUrl: getPublicThumbUrl(key),
    metrics: {
      originalSize: processed.originalSize,
      fullSize: processed.fullSize,
      thumbSize: processed.thumbSize,
      totalCompressedSize: processed.totalCompressedSize,
      savedPercent: processed.savedPercent,
      width: processed.width,
      height: processed.height,
    },
  };
}
