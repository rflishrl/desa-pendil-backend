import { z } from "zod";

/** Hostname pattern for uploaded assets on Vercel Blob storage. */
export const BLOB_HOSTNAME = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/;

/**
 * Image URL validation schema restricted to Vercel Blob storage.
 * Ensures assets are served from managed storage for Next.js image optimization.
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
 * Query parameter schema (?q=&page=&limit=) falling back to safe defaults on invalid values.
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
