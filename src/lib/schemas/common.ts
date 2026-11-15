import { z } from "zod";

import { isAcceptedMediaInput } from "@/lib/storage/media-key";

/**
 * Image reference validation schema supporting canonical R2 keys and public R2 URLs.
 * Exact R2 domain matching is additionally enforced server-side against `R2_PUBLIC_DOMAIN`.
 */
export const mediaImageUrl = z.string().trim().max(2048).refine(isAcceptedMediaInput, {
  error: "Foto harus diunggah lewat tombol Pilih foto.",
});

export const optionalMediaImageUrl = z.union([z.literal(""), mediaImageUrl]);

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
