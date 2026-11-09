import type {
  ArticleCreateInput,
  ArticleDto,
  ArticleUpdateInput,
} from "@/features/articles/schemas";
import { getDb } from "@/lib/db/client";
import { isUuid } from "@/lib/ids";

interface RawArticleRow {
  id: string;
  slug: string;
  type: string;
  title: string;
  excerpt: string | null;
  content: string;
  thumbnail_url: string | null;
  author: string;
  status: string;
  published_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

function toDto(row: RawArticleRow): ArticleDto {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type as "berita" | "artikel" | "postingan",
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    thumbnail: row.thumbnail_url,
    author: row.author,
    status: row.status as "draft" | "published",
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export interface ListParams {
  q?: string;
  limit: number;
  offset: number;
  publicOnly: boolean;
}

export async function listArticles({
  q,
  limit,
  offset,
  publicOnly,
}: ListParams): Promise<{ items: ArticleDto[]; total: number }> {
  const sql = getDb();
  const searchPattern = q ? `%${q.trim()}%` : null;

  const [rows, countRows] = await Promise.all([
    sql`
      SELECT id, slug, type, title, excerpt, content, thumbnail_url, author, status, published_at, created_at, updated_at
      FROM articles
      WHERE (${publicOnly} = false OR (type = 'berita' AND status = 'published'))
        AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern})
      ORDER BY COALESCE(published_at, created_at) DESC, id ASC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*)::int AS total
      FROM articles
      WHERE (${publicOnly} = false OR (type = 'berita' AND status = 'published'))
        AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern})
    `,
  ]);

  const items = (rows as unknown as RawArticleRow[]).map(toDto);
  const total = Number((countRows[0] as { total: number })?.total ?? 0);
  return { items, total };
}

export async function countArticles(status?: "draft" | "published"): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    SELECT COUNT(*)::int AS total
    FROM articles
    WHERE (${status ?? null}::text IS NULL OR status = ${status})
  `;
  return Number((rows[0] as { total: number })?.total ?? 0);
}

export async function findArticle(
  idOrSlug: string,
  { publicOnly }: { publicOnly: boolean },
): Promise<ArticleDto | null> {
  const sql = getDb();
  const isId = isUuid(idOrSlug);

  const rows = await sql`
    SELECT id, slug, type, title, excerpt, content, thumbnail_url, author, status, published_at, created_at, updated_at
    FROM articles
    WHERE (${isId ? idOrSlug : null}::uuid IS NOT NULL AND id = ${isId ? idOrSlug : null}::uuid)
       OR (slug = ${idOrSlug})
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  const item = toDto(rows[0] as unknown as RawArticleRow);
  if (publicOnly && (item.type !== "berita" || item.status !== "published")) {
    return null;
  }
  return item;
}

export async function insertArticle(input: ArticleCreateInput, slug: string): Promise<ArticleDto> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO articles (
      slug, type, title, excerpt, content, thumbnail_url, author, status, published_at
    ) VALUES (
      ${slug},
      ${input.type ?? "berita"},
      ${input.title},
      ${input.excerpt || null},
      ${input.content},
      ${input.thumbnail_url || null},
      ${input.author ?? "Admin"},
      ${input.status ?? "draft"},
      ${input.status === "published" ? new Date() : null}
    )
    RETURNING id, slug, type, title, excerpt, content, thumbnail_url, author, status, published_at, created_at, updated_at
  `;
  return toDto(rows[0] as unknown as RawArticleRow);
}

export async function updateArticle(
  id: string,
  input: ArticleUpdateInput,
): Promise<{ item: ArticleDto; previousThumbnail: string | null } | null> {
  const sql = getDb();

  const existing = await sql`SELECT thumbnail_url FROM articles WHERE id = ${id}::uuid LIMIT 1`;
  if (existing.length === 0) return null;
  const previousThumbnail = (existing[0] as { thumbnail_url: string | null }).thumbnail_url;

  const rows = await sql`
    UPDATE articles
    SET
      type = COALESCE(${input.type ?? null}, type),
      title = COALESCE(${input.title ?? null}, title),
      excerpt = CASE WHEN ${input.excerpt !== undefined} THEN ${input.excerpt || null} ELSE excerpt END,
      content = COALESCE(${input.content ?? null}, content),
      thumbnail_url = CASE WHEN ${input.thumbnail_url !== undefined} THEN ${input.thumbnail_url || null} ELSE thumbnail_url END,
      author = COALESCE(${input.author ?? null}, author),
      status = COALESCE(${input.status ?? null}, status),
      published_at = CASE
        WHEN ${input.status === "published"} THEN COALESCE(published_at, NOW())
        WHEN ${input.status === "draft"} THEN NULL
        ELSE published_at
      END,
      updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING id, slug, type, title, excerpt, content, thumbnail_url, author, status, published_at, created_at, updated_at
  `;

  if (rows.length === 0) return null;
  return {
    item: toDto(rows[0] as unknown as RawArticleRow),
    previousThumbnail,
  };
}

export async function deleteArticle(id: string): Promise<ArticleDto | null> {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM articles
    WHERE id = ${id}::uuid
    RETURNING id, slug, type, title, excerpt, content, thumbnail_url, author, status, published_at, created_at, updated_at
  `;
  if (rows.length === 0) return null;
  return toDto(rows[0] as unknown as RawArticleRow);
}
