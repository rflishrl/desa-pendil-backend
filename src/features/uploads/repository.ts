import { getDb } from "@/lib/db/client";

export interface MediaObjectRecord {
  key: string;
  folder: string;
  sizeBytes: number;
  thumbSizeBytes: number;
  contentType: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface InsertMediaObjectInput {
  key: string;
  folder: string;
  sizeBytes: number;
  thumbSizeBytes: number;
  contentType: string;
  width: number;
  height: number;
}

export interface MediaUsageSummary {
  totalBytes: number;
  totalThumbBytes: number;
  totalCount: number;
}

interface MediaObjectRow {
  key: string;
  folder: string;
  size_bytes: number | string;
  thumb_size_bytes: number | string;
  content_type: string;
  width: number | string;
  height: number | string;
  created_at: Date | string;
}

function mapMediaObjectRow(row: MediaObjectRow): MediaObjectRecord {
  return {
    key: row.key,
    folder: row.folder,
    sizeBytes: Number(row.size_bytes),
    thumbSizeBytes: Number(row.thumb_size_bytes),
    contentType: row.content_type,
    width: Number(row.width),
    height: Number(row.height),
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

/** Records a newly uploaded `full + thumb` media pair in `media_objects`. */
export async function insertMediaObject(input: InsertMediaObjectInput): Promise<MediaObjectRecord> {
  const sql = getDb();
  const rows = (await sql`
    INSERT INTO media_objects (
      key,
      folder,
      size_bytes,
      thumb_size_bytes,
      content_type,
      width,
      height
    )
    VALUES (
      ${input.key},
      ${input.folder},
      ${input.sizeBytes},
      ${input.thumbSizeBytes},
      ${input.contentType},
      ${input.width},
      ${input.height}
    )
    ON CONFLICT (key) DO UPDATE SET
      folder = EXCLUDED.folder,
      size_bytes = EXCLUDED.size_bytes,
      thumb_size_bytes = EXCLUDED.thumb_size_bytes,
      content_type = EXCLUDED.content_type,
      width = EXCLUDED.width,
      height = EXCLUDED.height
    RETURNING key, folder, size_bytes, thumb_size_bytes, content_type, width, height, created_at
  `) as MediaObjectRow[];

  const inserted = rows[0];
  if (!inserted) {
    throw new Error("Failed to insert media_objects row.");
  }
  return mapMediaObjectRow(inserted);
}

/** Fetches a single tracked media object by its canonical full key. */
export async function getMediaObjectByKey(key: string): Promise<MediaObjectRecord | null> {
  const sql = getDb();
  const rows = (await sql`
    SELECT key, folder, size_bytes, thumb_size_bytes, content_type, width, height, created_at
    FROM media_objects
    WHERE key = ${key}
    LIMIT 1
  `) as MediaObjectRow[];

  const row = rows[0];
  return row ? mapMediaObjectRow(row) : null;
}

/** Deletes a tracked media object record by key. Returns true when a row was removed. */
export async function deleteMediaObjectByKey(key: string): Promise<boolean> {
  const sql = getDb();
  const rows = (await sql`
    DELETE FROM media_objects
    WHERE key = ${key}
    RETURNING key
  `) as Array<{ key: string }>;
  return rows.length > 0;
}

/** Aggregates total tracked media storage usage (`full + thumb`) from `media_objects`. */
export async function getMediaUsageSummary(): Promise<MediaUsageSummary> {
  const sql = getDb();
  const rows = (await sql`
    SELECT
      COALESCE(SUM(size_bytes), 0) AS total_bytes,
      COALESCE(SUM(thumb_size_bytes), 0) AS total_thumb_bytes,
      COUNT(*) AS total_count
    FROM media_objects
  `) as Array<{
    total_bytes: number | string | null;
    total_thumb_bytes: number | string | null;
    total_count: number | string | null;
  }>;

  const row = rows[0];
  return {
    totalBytes: Number(row?.total_bytes ?? 0),
    totalThumbBytes: Number(row?.total_thumb_bytes ?? 0),
    totalCount: Number(row?.total_count ?? 0),
  };
}

/** Collects active image URLs referenced in articles and gallery. */
export async function listReferencedImageUrls(): Promise<Set<string>> {
  const sql = getDb();
  const [articles, gallery] = await Promise.all([
    sql`SELECT thumbnail_url FROM articles WHERE thumbnail_url IS NOT NULL`,
    sql`SELECT url FROM gallery_images WHERE url IS NOT NULL`,
  ]);

  const urls = [
    ...(articles as unknown as { thumbnail_url: string }[]).map((r) => r.thumbnail_url),
    ...(gallery as unknown as { url: string }[]).map((r) => r.url),
  ];
  return new Set(urls.filter((url): url is string => Boolean(url)));
}
