import "server-only";

import { type UploadResult, uploadFormSchema } from "@/features/uploads/schemas";
import type { Actor } from "@/lib/auth/actor";
import { assertAdmin } from "@/lib/auth/authorize";
import { UPLOAD_PREFIX, uploadImage } from "@/lib/storage/blob";

/**
 * Uploads a single image file to Vercel Blob after validating headers and magic bytes.
 * Persists to Blob storage without database tracking.
 */
export async function uploadPhoto(actor: Actor | null, form: FormData): Promise<UploadResult> {
  assertAdmin(actor);
  const { folder, file } = uploadFormSchema.parse({
    folder: form.get("folder"),
    file: form.get("file"),
  });
  const url = await uploadImage(file, `${UPLOAD_PREFIX}${folder}`);
  return { url };
}
