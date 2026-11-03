import "server-only";

import {
  uploadFormSchema,
  type UploadResult,
} from "@/features/uploads/schemas";
import type { Actor } from "@/lib/auth/actor";
import { assertAdmin } from "@/lib/auth/authorize";
import { UPLOAD_PREFIX, uploadImage } from "@/lib/storage/blob";

/**
 * Unggah satu foto. Tipe, ukuran, dan isi file (byte awal) diperiksa di lib/storage/blob.
 * Tidak ada repository: penyimpanannya Vercel Blob, bukan database.
 */
export async function uploadPhoto(
  actor: Actor | null,
  form: FormData,
): Promise<UploadResult> {
  assertAdmin(actor);
  const { folder, file } = uploadFormSchema.parse({
    folder: form.get("folder"),
    file: form.get("file"),
  });
  const url = await uploadImage(file, `${UPLOAD_PREFIX}${folder}`);
  return { url };
}
