import "server-only";

import { getDb } from "@/lib/db/client";
import type {
  GalleryCreateInput,
  GalleryDto,
  GalleryUpdateInput,
} from "@/features/gallery/schemas";

interface RawGalleryRow {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  sort_order: number;
  created_at: string | Date;
  updated_at: string | Date;
}

function toDto(row: RawGalleryRow): GalleryDto {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt,
    caption: row.caption,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function listGalleryImages({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}): Promise<{ items: GalleryDto[]; total: number }> {
  const sql = getDb();
  const [rows, countRows] = await Promise.all([
    sql`
      SELECT id, url, alt, caption, sort_order, created_at, updated_at
      FROM gallery_images
      ORDER BY sort_order ASC, created_at DESC, id ASC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*)::int AS total
      FROM gallery_images
    `,
  ]);

  const items = (rows as unknown as RawGalleryRow[]).map(toDto);
  const total = Number((countRows[0] as { total: number })?.total ?? 0);
  return { items, total };
}

export async function countGalleryImages(): Promise<number> {
  const sql = getDb();
  const rows = await sql`SELECT COUNT(*)::int AS total FROM gallery_images`;
  return Number((rows[0] as { total: number })?.total ?? 0);
}

export async function findGalleryImage(id: string): Promise<GalleryDto | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, url, alt, caption, sort_order, created_at, updated_at
    FROM gallery_images
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return toDto(rows[0] as unknown as RawGalleryRow);
}

export async function insertGalleryImage(
  input: GalleryCreateInput,
): Promise<GalleryDto> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO gallery_images (url, alt, caption, sort_order)
    VALUES (
      ${input.url},
      ${input.alt},
      ${input.caption || null},
      ${input.sort_order ?? 0}
    )
    RETURNING id, url, alt, caption, sort_order, created_at, updated_at
  `;
  return toDto(rows[0] as unknown as RawGalleryRow);
}

export async function updateGalleryImage(
  id: string,
  input: GalleryUpdateInput,
): Promise<{ item: GalleryDto; previousUrl: string } | null> {
  const sql = getDb();

  const existing =
    await sql`SELECT url FROM gallery_images WHERE id = ${id}::uuid LIMIT 1`;
  if (existing.length === 0) return null;
  const previousUrl = (existing[0] as { url: string }).url;

  const rows = await sql`
    UPDATE gallery_images
    SET
      url = COALESCE(${input.url ?? null}, url),
      alt = COALESCE(${input.alt ?? null}, alt),
      caption = CASE WHEN ${input.caption !== undefined} THEN ${input.caption || null} ELSE caption END,
      sort_order = COALESCE(${input.sort_order ?? null}, sort_order),
      updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING id, url, alt, caption, sort_order, created_at, updated_at
  `;

  if (rows.length === 0) return null;
  return { item: toDto(rows[0] as unknown as RawGalleryRow), previousUrl };
}

export async function deleteGalleryImage(
  id: string,
): Promise<GalleryDto | null> {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM gallery_images
    WHERE id = ${id}::uuid
    RETURNING id, url, alt, caption, sort_order, created_at, updated_at
  `;
  if (rows.length === 0) return null;
  return toDto(rows[0] as unknown as RawGalleryRow);
}
