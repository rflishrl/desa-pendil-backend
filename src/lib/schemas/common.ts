import { z } from "zod";

/** Host Vercel Blob tempat semua foto unggahan disimpan. */
export const BLOB_HOSTNAME = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/;

/**
 * URL foto: hanya Vercel Blob (hasil unggah lewat /api/upload). Host lain ditolak supaya
 * frontend selalu bisa mengoptimasi gambarnya dan tidak bergantung pada situs lain.
 */
export const blobImageUrl = z
  .url({
    protocol: /^https$/,
    hostname: BLOB_HOSTNAME,
    error: "Foto harus diunggah lewat tombol Pilih foto (alamat Vercel Blob).",
  })
  .max(2048);

export const optionalBlobImageUrl = z.union([z.literal(""), blobImageUrl]);

export const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(2, `${label} minimal 2 karakter.`)
    .max(max, `${label} maksimal ${max} karakter.`);

export const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} maksimal ${max} karakter.`);

/**
 * Parameter daftar (?q=&page=&limit=). Nilai yang tidak masuk akal tidak ditolak,
 * tapi diganti nilai bawaan, sama seperti API lama.
 */
export function listQuerySchema(defaultLimit: number) {
  return z.object({
    q: z
      .string()
      .optional()
      .transform((value) => value?.trim().slice(0, 100) || undefined),
    page: z.coerce.number().int().min(1).max(10_000).catch(1),
    limit: z.coerce.number().int().min(1).max(100).catch(defaultLimit),
  });
}

export type ListQuery = z.output<ReturnType<typeof listQuerySchema>>;
