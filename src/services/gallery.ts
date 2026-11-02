import { asc, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { galleryImages, type GalleryImageRow } from "@/db/schema";
import { ApiError } from "@/lib/http";
import { absoluteUrl, deleteImage } from "@/lib/storage";
import type { GalleryInput, GalleryPatch } from "@/lib/validation";

export async function listGallery(): Promise<GalleryImageRow[]> {
  return getDb()
    .select()
    .from(galleryImages)
    .orderBy(asc(galleryImages.sortOrder), desc(galleryImages.createdAt), desc(galleryImages.id));
}

export async function countGallery(): Promise<number> {
  const [row] = await getDb().select({ total: count() }).from(galleryImages);
  return row?.total ?? 0;
}

export async function createGalleryImage(input: GalleryInput): Promise<GalleryImageRow> {
  const [row] = await getDb()
    .insert(galleryImages)
    .values({
      url: input.url,
      alt: input.alt,
      caption: input.caption ?? null,
      sortOrder: input.sortOrder,
    })
    .returning();
  if (!row) throw new ApiError(500, "Gagal menyimpan foto");
  return row;
}

export async function updateGalleryImage(id: string, patch: GalleryPatch): Promise<GalleryImageRow> {
  const [row] = await getDb()
    .update(galleryImages)
    .set({
      ...(patch.alt !== undefined && { alt: patch.alt }),
      ...(patch.caption !== undefined && { caption: patch.caption }),
      ...(patch.sortOrder !== undefined && { sortOrder: patch.sortOrder }),
    })
    .where(eq(galleryImages.id, id))
    .returning();
  if (!row) throw new ApiError(404, "Foto tidak ditemukan");
  return row;
}

export async function deleteGalleryImage(id: string): Promise<void> {
  const [row] = await getDb().delete(galleryImages).where(eq(galleryImages.id, id)).returning();
  if (!row) throw new ApiError(404, "Foto tidak ditemukan");
  await deleteImage(row.url);
}

export function toGalleryDto(g: GalleryImageRow) {
  return {
    id: g.id,
    src: absoluteUrl(g.url),
    alt: g.alt,
    caption: g.caption,
    sortOrder: g.sortOrder,
    createdAt: g.createdAt.toISOString(),
  };
}
