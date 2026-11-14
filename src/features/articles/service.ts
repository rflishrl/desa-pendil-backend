import {
  findArticle,
  insertArticle,
  listArticles,
  deleteArticle as repoDeleteArticle,
  updateArticle as repoUpdateArticle,
} from "@/features/articles/repository";
import {
  type ArticleCreateInput,
  type ArticleDto,
  articleCreateSchema,
  articleUpdateSchema,
} from "@/features/articles/schemas";
import { deleteStoredMedia } from "@/features/uploads/media-storage";
import { AppError, notFound } from "@/lib/api/errors";
import { type Paginated, paginate } from "@/lib/api/types";
import type { Actor } from "@/lib/auth/actor";
import { assertAdmin } from "@/lib/auth/authorize";
import { isUuid } from "@/lib/ids";
import { revalidateFrontend } from "@/lib/revalidate";
import { listQuerySchema } from "@/lib/schemas/common";
import { randomSuffix, slugify } from "@/lib/slug";
import { comparableMediaRef } from "@/lib/storage/media-key";
import { normalizeMediaInputForStorage } from "@/lib/storage/media-url";

const LABEL = "Konten";
const REVALIDATE_TAGS = ["news"];
const MAX_SLUG_ATTEMPTS = 5;

type Viewer = { audience: "public" } | { audience: "admin"; actor: Actor | null };

/** Public: published articles only, 50/page. Admin: all entries and drafts, 10/page. */
export async function listArticlesFor(
  viewer: Viewer,
  rawQuery: unknown,
): Promise<Paginated<ArticleDto>> {
  const isAdmin = viewer.audience === "admin";
  if (isAdmin) assertAdmin(viewer.actor);

  const { q, page, limit } = listQuerySchema(isAdmin ? 10 : 50).parse(rawQuery);
  const { items, total } = await listArticles({
    q,
    limit,
    offset: (page - 1) * limit,
    publicOnly: !isAdmin,
  });
  return paginate(items, total, page, limit);
}

export async function getArticle(viewer: Viewer, idOrSlug: string): Promise<ArticleDto> {
  const isAdmin = viewer.audience === "admin";
  if (isAdmin) assertAdmin(viewer.actor);

  const item = await findArticle(idOrSlug, { publicOnly: !isAdmin });
  if (!item) throw notFound(LABEL);
  return item;
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSuffix()}`;
    const existing = await findArticle(candidate, { publicOnly: false });
    if (!existing) return candidate;
  }
  throw new AppError("CONFLICT", "Gagal membuat slug unik. Coba judul lain.");
}

export async function createArticle(actor: Actor | null, rawInput: unknown): Promise<ArticleDto> {
  assertAdmin(actor);
  const parsed: ArticleCreateInput = articleCreateSchema.parse(rawInput);
  const input: ArticleCreateInput = {
    ...parsed,
    thumbnail_url: normalizeMediaInputForStorage(parsed.thumbnail_url),
  };
  const slug = await generateUniqueSlug(input.title);
  const created = await insertArticle(input, slug);
  revalidateFrontend(REVALIDATE_TAGS);
  return created;
}

export async function updateArticle(
  actor: Actor | null,
  id: string,
  rawInput: unknown,
): Promise<ArticleDto> {
  assertAdmin(actor);
  if (!isUuid(id)) throw notFound(LABEL);
  const parsed = articleUpdateSchema.parse(rawInput);

  if (Object.keys(parsed).length === 0) {
    return getArticle({ audience: "admin", actor }, id);
  }

  const input =
    parsed.thumbnail_url !== undefined
      ? {
          ...parsed,
          thumbnail_url: normalizeMediaInputForStorage(parsed.thumbnail_url),
        }
      : parsed;

  const result = await repoUpdateArticle(id, input);
  if (!result) throw notFound(LABEL);

  const { item, previousThumbnail } = result;
  if (
    previousThumbnail &&
    comparableMediaRef(previousThumbnail) !== comparableMediaRef(item.thumbnail ?? "")
  ) {
    await deleteStoredMedia(previousThumbnail);
  }

  revalidateFrontend(REVALIDATE_TAGS);
  return item;
}

export async function deleteArticle(actor: Actor | null, id: string): Promise<{ id: string }> {
  assertAdmin(actor);
  if (!isUuid(id)) throw notFound(LABEL);

  const removed = await repoDeleteArticle(id);
  if (!removed) throw notFound(LABEL);

  if (removed.thumbnail) await deleteStoredMedia(removed.thumbnail);
  revalidateFrontend(REVALIDATE_TAGS);
  return { id };
}
