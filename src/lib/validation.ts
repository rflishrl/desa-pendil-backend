import { z } from "zod";
import { ARTICLE_STATUSES, ARTICLE_TYPES } from "@/db/schema";

/** Accept our own upload paths or https URLs (e.g. Vercel Blob). */
const mediaUrl = z
  .string()
  .max(500)
  .refine((v) => v.startsWith("/uploads/") || /^https:\/\/[^\s]+$/.test(v), {
    message: "Must be an /uploads/ path or an https URL",
  });

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const articleInputSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(200, "Judul maksimal 200 karakter"),
  type: z.enum(ARTICLE_TYPES),
  excerpt: z.preprocess(emptyToUndefined, z.string().trim().max(300, "Ringkasan maksimal 300 karakter").optional()),
  content: z.string().trim().min(1, "Isi tidak boleh kosong").max(50_000, "Isi terlalu panjang"),
  thumbnailUrl: z.preprocess(emptyToUndefined, mediaUrl.optional()),
  author: z.string().trim().min(1, "Penulis wajib diisi").max(80).default("Admin"),
  status: z.enum(ARTICLE_STATUSES),
  publishedAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

export const articlePatchSchema = articleInputSchema
  .partial()
  .extend({
    thumbnailUrl: mediaUrl.nullable().optional(),
    excerpt: z.string().trim().max(300, "Ringkasan maksimal 300 karakter").nullable().optional(),
  });
export type ArticlePatch = z.infer<typeof articlePatchSchema>;

export const galleryInputSchema = z.object({
  url: mediaUrl,
  alt: z.string().trim().min(3, "Teks alternatif minimal 3 karakter").max(200),
  caption: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
});
export type GalleryInput = z.infer<typeof galleryInputSchema>;

export const galleryPatchSchema = galleryInputSchema.omit({ url: true }).partial();
export type GalleryPatch = z.infer<typeof galleryPatchSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi").max(200),
});

export const uuidSchema = z.string().uuid();
