import "server-only";

import type {
  ArticleCreateInput,
  ArticleDto,
  ArticleUpdateInput,
} from "@/features/articles/schemas";
import { isUuid } from "@/lib/ids";
import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type ArticleRow = Tables<"articles">;

function toDto(row: ArticleRow): ArticleDto {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    thumbnail: row.thumbnail_url,
    author: row.author,
    status: row.status,
    publishedAt: row.published_at
      ? new Date(row.published_at).toISOString()
      : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** Maps input to snake_case columns. Empty strings serialize as NULL; omitted fields are excluded. */
function toColumns(input: ArticleUpdateInput) {
  return {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.type !== undefined && { type: input.type }),
    ...(input.excerpt !== undefined && { excerpt: input.excerpt || null }),
    ...(input.content !== undefined && { content: input.content }),
    ...(input.thumbnail_url !== undefined && {
      thumbnail_url: input.thumbnail_url || null,
    }),
    ...(input.author !== undefined && { author: input.author }),
    ...(input.status !== undefined && { status: input.status }),
  };
}

export interface ListParams {
  q?: string;
  limit: number;
  offset: number;
  /** When true, queries published articles only; RLS enforces equivalent public access. */
  publicOnly: boolean;
}

export async function listArticles(
  supabase: AppSupabaseClient,
  { q, limit, offset, publicOnly }: ListParams,
): Promise<{ items: ArticleDto[]; total: number }> {
  const type = publicOnly ? ("berita" as const) : undefined;
  const status = publicOnly ? ("published" as const) : undefined;

  const [rows, count] = await Promise.all([
    supabase.rpc("list_articles", {
      p_type: type,
      p_status: status,
      p_q: q,
      p_limit: limit,
      p_offset: offset,
    }),
    supabase.rpc("count_articles", { p_type: type, p_status: status, p_q: q }),
  ]);
  if (rows.error) throw toAppError(rows.error, "memuat konten");
  if (count.error) throw toAppError(count.error, "menghitung konten");
  return { items: rows.data.map(toDto), total: count.data };
}

export async function countArticles(
  supabase: AppSupabaseClient,
  status?: "draft" | "published",
): Promise<number> {
  const { data, error } = await supabase.rpc("count_articles", {
    p_status: status,
  });
  if (error) throw toAppError(error, "menghitung konten");
  return data;
}

/** Mencari lewat id (UUID) atau slug. */
export async function findArticle(
  supabase: AppSupabaseClient,
  idOrSlug: string,
  { publicOnly }: { publicOnly: boolean },
): Promise<ArticleDto | null> {
  let query = supabase.from("articles").select("*");
  query = isUuid(idOrSlug)
    ? query.eq("id", idOrSlug)
    : query.eq("slug", idOrSlug);
  if (publicOnly) query = query.eq("type", "berita").eq("status", "published");

  const { data, error } = await query.maybeSingle();
  if (error) throw toAppError(error, "memuat konten");
  return data ? toDto(data) : null;
}

export async function insertArticle(
  supabase: AppSupabaseClient,
  input: ArticleCreateInput,
  slug: string,
): Promise<ArticleDto> {
  const { data, error } = await supabase
    .from("articles")
    .insert({
      ...toColumns(input),
      slug,
      title: input.title,
      content: input.content,
    })
    .select("*")
    .single();
  if (error) throw toAppError(error, "menyimpan konten");
  return toDto(data);
}

/** Updates row with row-level database lock (RPC update_article); returns null if not found. */
export async function updateArticle(
  supabase: AppSupabaseClient,
  id: string,
  input: ArticleUpdateInput,
): Promise<{ item: ArticleDto; previousThumbnail: string | null } | null> {
  const { data, error } = await supabase
    .rpc("update_article", { p_id: id, p_patch: toColumns(input) })
    .maybeSingle();
  if (error) throw toAppError(error, "menyimpan perubahan");
  if (!data) return null;

  const { previous_thumbnail_url: previousThumbnail, ...row } = data;
  return { item: toDto(row), previousThumbnail };
}

export async function deleteArticle(
  supabase: AppSupabaseClient,
  id: string,
): Promise<ArticleDto | null> {
  const { data, error } = await supabase
    .from("articles")
    .delete()
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw toAppError(error, "menghapus konten");
  return data ? toDto(data) : null;
}
