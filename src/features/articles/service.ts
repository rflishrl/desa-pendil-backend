import "server-only";

import {
  deleteArticle,
  findArticle,
  insertArticle,
  listArticles,
  updateArticle,
} from "@/features/articles/repository";
import {
  articleCreateSchema,
  articleUpdateSchema,
  type ArticleCreateInput,
  type ArticleDto,
} from "@/features/articles/schemas";
import { AppError, notFound } from "@/lib/api/errors";
import { paginate, type Paginated } from "@/lib/api/types";
import type { Actor } from "@/lib/auth/actor";
import { assertAdmin } from "@/lib/auth/authorize";
import { isUuid } from "@/lib/ids";
import { revalidateFrontend } from "@/lib/revalidate";
import { listQuerySchema } from "@/lib/schemas/common";
import { randomSuffix, slugify } from "@/lib/slug";
import { deleteImage } from "@/lib/storage/blob";
import type { AppSupabaseClient } from "@/lib/supabase/server";

const LABEL = "Konten";
const REVALIDATE_TAGS = ["news"];
const MAX_SLUG_ATTEMPTS = 5;

type Viewer =
  { audience: "public" } | { audience: "admin"; actor: Actor | null };

/** Public: published articles only, 50/page. Admin: all entries and drafts, 10/page. */
export async function listArticlesFor(
  supabase: AppSupabaseClient,
  viewer: Viewer,
  rawQuery: unknown,
): Promise<Paginated<ArticleDto>> {
  const isAdmin = viewer.audience === "admin";
  if (isAdmin) assertAdmin(viewer.actor);

  const { q, page, limit } = listQuerySchema(isAdmin ? 10 : 50).parse(rawQuery);
  const { items, total } = await listArticles(supabase, {
    q,
    limit,
    offset: (page - 1) * limit,
    publicOnly: !isAdmin,
  });
  return paginate(items, total, page, limit);
}

export async function getArticle(
  supabase: AppSupabaseClient,
  viewer: Viewer,
  idOrSlug: string,
): Promise<ArticleDto> {
  const isAdmin = viewer.audience === "admin";
  if (isAdmin) assertAdmin(viewer.actor);

  const article = await findArticle(supabase, idOrSlug, {
    publicOnly: !isAdmin,
  });
  if (!article) throw notFound(LABEL);
  return article;
}

/** Retries slug collisions with random suffix; database constraint guarantees uniqueness. */
async function insertWithUniqueSlug(
  supabase: AppSupabaseClient,
  input: ArticleCreateInput,
): Promise<ArticleDto> {
  const base = slugify(input.title);
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${randomSuffix()}`;
    try {
      return await insertArticle(supabase, input, slug);
    } catch (error) {
      if (error instanceof AppError && error.code === "CONFLICT") continue;
      throw error;
    }
  }
  throw new AppError(
    "CONFLICT",
    "Judul ini sudah dipakai. Ubah sedikit judulnya.",
  );
}

export async function createArticle(
  supabase: AppSupabaseClient,
  actor: Actor | null,
  rawInput: unknown,
): Promise<ArticleDto> {
  assertAdmin(actor);
  const input = articleCreateSchema.parse(rawInput);
  const created = await insertWithUniqueSlug(supabase, input);
  revalidateFrontend(REVALIDATE_TAGS);
  return created;
}

export async function updateArticleById(
  supabase: AppSupabaseClient,
  actor: Actor | null,
  id: string,
  rawInput: unknown,
): Promise<ArticleDto> {
  assertAdmin(actor);
  const input = articleUpdateSchema.parse(rawInput);
  if (!isUuid(id)) throw notFound(LABEL);

  if (Object.keys(input).length === 0) {
    return getArticle(supabase, { audience: "admin", actor }, id);
  }

  const result = await updateArticle(supabase, id, input);
  if (!result) throw notFound(LABEL);

  if (
    result.previousThumbnail &&
    result.previousThumbnail !== result.item.thumbnail
  ) {
    await deleteImage(result.previousThumbnail);
  }
  revalidateFrontend(REVALIDATE_TAGS);
  return result.item;
}

export async function deleteArticleById(
  supabase: AppSupabaseClient,
  actor: Actor | null,
  id: string,
): Promise<{ id: string }> {
  assertAdmin(actor);
  const removed = isUuid(id) ? await deleteArticle(supabase, id) : null;
  if (!removed) throw notFound(LABEL);

  await deleteImage(removed.thumbnail ?? undefined);
  revalidateFrontend(REVALIDATE_TAGS);
  return { id };
}
