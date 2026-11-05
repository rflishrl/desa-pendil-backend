import "server-only";

import {
  deleteGalleryImage as repoDeleteGalleryImage,
  findGalleryImage,
  insertGalleryImage,
  listGalleryImages,
  updateGalleryImage as repoUpdateGalleryImage,
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

const LABEL = "Foto";
const REVALIDATE_TAGS = ["gallery"];

type Viewer =
  { audience: "public" } | { audience: "admin"; actor: Actor | null };

/** Public: 50 items/page. Admin: 12 items/page. Gallery items are always published. */
export async function listGalleryFor(
  viewer: Viewer,
  rawQuery: unknown,
): Promise<Paginated<GalleryDto>> {
  const isAdmin = viewer.audience === "admin";
  if (isAdmin) assertAdmin(viewer.actor);

  const { page, limit } = listQuerySchema(isAdmin ? 12 : 50).parse(rawQuery);
  const { items, total } = await listGalleryImages({
    limit,
    offset: (page - 1) * limit,
  });
  return paginate(items, total, page, limit);
}

export async function getGalleryImage(
  actor: Actor | null,
  id: string,
): Promise<GalleryDto> {
  assertAdmin(actor);
  const image = isUuid(id) ? await findGalleryImage(id) : null;
  if (!image) throw notFound(LABEL);
  return image;
}

export async function createGalleryImage(
  actor: Actor | null,
  rawInput: unknown,
): Promise<GalleryDto> {
  assertAdmin(actor);
  const input = galleryCreateSchema.parse(rawInput);
  const created = await insertGalleryImage(input);
  revalidateFrontend(REVALIDATE_TAGS);
  return created;
}

export async function updateGalleryImageById(
  actor: Actor | null,
  id: string,
  rawInput: unknown,
): Promise<GalleryDto> {
  assertAdmin(actor);
  const input = galleryUpdateSchema.parse(rawInput);
  const current = await getGalleryImage(actor, id);
  if (Object.keys(input).length === 0) return current;

  const result = await repoUpdateGalleryImage(id, input);
  if (!result) throw notFound(LABEL);

  const { item, previousUrl } = result;
  if (previousUrl && previousUrl !== item.url) await deleteImage(previousUrl);
  revalidateFrontend(REVALIDATE_TAGS);
  return item;
}

export async function deleteGalleryImageById(
  actor: Actor | null,
  id: string,
): Promise<{ id: string }> {
  assertAdmin(actor);
  const removed = isUuid(id) ? await repoDeleteGalleryImage(id) : null;
  if (!removed) throw notFound(LABEL);

  await deleteImage(removed.url);
  revalidateFrontend(REVALIDATE_TAGS);
  return { id };
}
