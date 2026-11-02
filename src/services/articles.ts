import { and, count, desc, eq, ilike, isNotNull, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { articles, type ArticleRow } from "@/db/schema";
import { ApiError } from "@/lib/http";
import { randomSuffix, slugify } from "@/lib/slug";
import { absoluteUrl, deleteImage } from "@/lib/storage";
import type { ArticleInput, ArticlePatch } from "@/lib/validation";

type ArticleType = ArticleRow["type"];
type ArticleStatus = ArticleRow["status"];

export interface ListOptions {
  type?: ArticleType;
  status?: ArticleStatus;
  q?: string;
  page?: number;
  limit?: number;
  /** Public listing: published only, and not scheduled for the future. */
  publicOnly?: boolean;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function filters(opts: ListOptions): SQL | undefined {
  const conditions: SQL[] = [];
  if (opts.type) conditions.push(eq(articles.type, opts.type));
  if (opts.publicOnly) {
    conditions.push(eq(articles.status, "published"));
    conditions.push(isNotNull(articles.publishedAt));
    conditions.push(lte(articles.publishedAt, new Date()));
  } else if (opts.status) {
    conditions.push(eq(articles.status, opts.status));
  }
  if (opts.q) {
    const term = `%${escapeLike(opts.q)}%`;
    const match = or(ilike(articles.title, term), ilike(articles.excerpt, term));
    if (match) conditions.push(match);
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function listArticles(opts: ListOptions = {}): Promise<Paged<ArticleRow>> {
  const db = getDb();
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 100);
  const page = Math.max(opts.page ?? 1, 1);
  const where = filters(opts);

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(articles)
      .where(where)
      .orderBy(desc(sql`coalesce(${articles.publishedAt}, ${articles.createdAt})`), desc(articles.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(articles).where(where),
  ]);

  const total = totals[0]?.total ?? 0;
  return { items: rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Looks an article up by uuid or slug. */
export async function findArticle(idOrSlug: string): Promise<ArticleRow | undefined> {
  const db = getDb();
  const where = UUID_RE.test(idOrSlug) ? eq(articles.id, idOrSlug) : eq(articles.slug, idOrSlug);
  const [row] = await db.select().from(articles).where(where).limit(1);
  return row;
}

export async function getArticleOrThrow(idOrSlug: string): Promise<ArticleRow> {
  const row = await findArticle(idOrSlug);
  if (!row) throw new ApiError(404, "Artikel tidak ditemukan");
  return row;
}

async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const db = getDb();
  const base = slugify(title);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSuffix()}`;
    const [clash] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, candidate))
      .limit(1);
    if (!clash || clash.id === excludeId) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createArticle(input: ArticleInput): Promise<ArticleRow> {
  const db = getDb();
  const publishedAt = input.status === "published" ? (input.publishedAt ?? new Date()) : (input.publishedAt ?? null);

  const [row] = await db
    .insert(articles)
    .values({
      slug: await uniqueSlug(input.title),
      type: input.type,
      title: input.title,
      excerpt: input.excerpt ?? null,
      content: input.content,
      thumbnailUrl: input.thumbnailUrl ?? null,
      author: input.author,
      status: input.status,
      publishedAt,
    })
    .returning();
  if (!row) throw new ApiError(500, "Gagal menyimpan artikel");
  return row;
}

export async function updateArticle(id: string, patch: ArticlePatch): Promise<ArticleRow> {
  const db = getDb();
  const current = await getArticleOrThrow(id);

  const status = patch.status ?? current.status;
  let publishedAt = patch.publishedAt ?? current.publishedAt;
  if (status === "published" && !publishedAt) publishedAt = new Date();

  const thumbnailChanged = patch.thumbnailUrl !== undefined && patch.thumbnailUrl !== current.thumbnailUrl;

  const [row] = await db
    .update(articles)
    .set({
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.type !== undefined && { type: patch.type }),
      ...(patch.excerpt !== undefined && { excerpt: patch.excerpt }),
      ...(patch.content !== undefined && { content: patch.content }),
      ...(patch.thumbnailUrl !== undefined && { thumbnailUrl: patch.thumbnailUrl }),
      ...(patch.author !== undefined && { author: patch.author }),
      status,
      publishedAt,
    })
    .where(eq(articles.id, current.id))
    .returning();
  if (!row) throw new ApiError(500, "Gagal memperbarui artikel");

  if (thumbnailChanged) await deleteImage(current.thumbnailUrl);
  return row;
}

/** Removes the row first, then the image, so a failed file delete cannot leave a dangling row. */
export async function deleteArticle(id: string): Promise<void> {
  const db = getDb();
  const [row] = await db.delete(articles).where(eq(articles.id, id)).returning();
  if (!row) throw new ApiError(404, "Artikel tidak ditemukan");
  await deleteImage(row.thumbnailUrl);
}

export async function articleStats() {
  const rows = await getDb()
    .select({ type: articles.type, status: articles.status, total: count() })
    .from(articles)
    .groupBy(articles.type, articles.status);

  const stats = { published: 0, draft: 0, byType: { berita: 0, artikel: 0, postingan: 0 } };
  for (const r of rows) {
    stats[r.status] += r.total;
    stats.byType[r.type] += r.total;
  }
  return stats;
}

/** Shape the existing frontend (`getArticles` in desa-pendil) already reads from /v1/news. */
export function toLegacyNews(a: ArticleRow) {
  return {
    id: a.id,
    slug: a.slug,
    judul: a.title,
    ringkasan: a.excerpt,
    isi: a.content,
    author: a.author,
    thumbnail: absoluteUrl(a.thumbnailUrl),
    createdAt: (a.publishedAt ?? a.createdAt).toISOString(),
  };
}

/** Clean REST shape for new clients. */
export function toArticleDto(a: ArticleRow) {
  return {
    id: a.id,
    slug: a.slug,
    type: a.type,
    title: a.title,
    excerpt: a.excerpt,
    content: a.content,
    thumbnailUrl: absoluteUrl(a.thumbnailUrl),
    author: a.author,
    status: a.status,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
