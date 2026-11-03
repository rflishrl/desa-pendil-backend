import "server-only";

import {
  deleteGalleryImage,
  findGalleryImage,
  insertGalleryImage,
  listGalleryImages,
  updateGalleryImage,
} from "@/features/gallery/repository";
import {
  galleryCreateSchema,
  galleryUpdateSchema,
  type GalleryDto,
} from "@/features/gallery/schemas";
import { notFound } from "@/lib/api/errors";
import { paginate, type Paginated } from "@/lib/api/types";
import type { Actor } from "@/lib/auth/actor";
import { assertAdmin } from "@/lib/auth/authorize";
import { isUuid } from "@/lib/ids";
import { revalidateFrontend } from "@/lib/revalidate";
import { listQuerySchema } from "@/lib/schemas/common";
import { deleteImage } from "@/lib/storage/blob";
import type { AppSupabaseClient } from "@/lib/supabase/server";

const LABEL = "Foto";
const REVALIDATE_TAGS = ["gallery"];

type Viewer =
  { audience: "public" } | { audience: "admin"; actor: Actor | null };

/** Publik: 50 foto per halaman. Admin: 12 per halaman. Galeri tidak punya status draf. */
export async function listGalleryFor(
  supabase: AppSupabaseClient,
  viewer: Viewer,
  rawQuery: unknown,
): Promise<Paginated<GalleryDto>> {
  const isAdmin = viewer.audience === "admin";
  if (isAdmin) assertAdmin(viewer.actor);

  const { page, limit } = listQuerySchema(isAdmin ? 12 : 50).parse(rawQuery);
  const { items, total } = await listGalleryImages(supabase, {
    limit,
    offset: (page - 1) * limit,
  });
  return paginate(items, total, page, limit);
}

export async function getGalleryImage(
  supabase: AppSupabaseClient,
  actor: Actor | null,
  id: string,
): Promise<GalleryDto> {
  assertAdmin(actor);
  const image = isUuid(id) ? await findGalleryImage(supabase, id) : null;
  if (!image) throw notFound(LABEL);
  return image;
}

export async function createGalleryImage(
  supabase: AppSupabaseClient,
  actor: Actor | null,
  rawInput: unknown,
): Promise<GalleryDto> {
  assertAdmin(actor);
  const input = galleryCreateSchema.parse(rawInput);
  const created = await insertGalleryImage(supabase, input);
  revalidateFrontend(REVALIDATE_TAGS);
  return created;
}

export async function updateGalleryImageById(
  supabase: AppSupabaseClient,
  actor: Actor | null,
  id: string,
  rawInput: unknown,
): Promise<GalleryDto> {
  assertAdmin(actor);
  const input = galleryUpdateSchema.parse(rawInput);
  const current = await getGalleryImage(supabase, actor, id);
  if (Object.keys(input).length === 0) return current;

  const updated = await updateGalleryImage(supabase, id, input);
  if (!updated) throw notFound(LABEL);

  if (current.url !== updated.url) await deleteImage(current.url);
  revalidateFrontend(REVALIDATE_TAGS);
  return updated;
}

export async function deleteGalleryImageById(
  supabase: AppSupabaseClient,
  actor: Actor | null,
  id: string,
): Promise<{ id: string }> {
  assertAdmin(actor);
  const removed = isUuid(id) ? await deleteGalleryImage(supabase, id) : null;
  if (!removed) throw notFound(LABEL);

  await deleteImage(removed.url);
  revalidateFrontend(REVALIDATE_TAGS);
  return { id };
}
