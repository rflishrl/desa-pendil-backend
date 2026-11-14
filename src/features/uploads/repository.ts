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

export interface MediaObjectEntryMeta {
  key: string;
  createdAt: string;
}

/** Lists all tracked keys with timestamps for accurate active vs orphan classification. */
export async function listMediaObjectEntries(): Promise<MediaObjectEntryMeta[]> {
  const sql = getDb();
  const rows = (await sql`
    SELECT key, created_at
    FROM media_objects
    ORDER BY created_at DESC
  `) as Array<{ key: string; created_at: Date | string }>;

  return rows.map((row) => ({
    key: row.key,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }));
}

/** Lists paginated `media_objects` records ordered from newest to oldest. */
export async function listMediaObjectsPage(params: {
  limit: number;
  offset: number;
}): Promise<MediaObjectRecord[]> {
  const sql = getDb();
  const rows = (await sql`
    SELECT key, folder, size_bytes, thumb_size_bytes, content_type, width, height, created_at
    FROM media_objects
    ORDER BY created_at DESC
    LIMIT ${params.limit}
    OFFSET ${params.offset}
  `) as MediaObjectRow[];

  return rows.map(mapMediaObjectRow);
}

/** Lists `media_objects` created strictly before `olderThan` for cron orphan cleanup. */
export async function listOrphanCandidateMediaObjects(
  olderThan: Date,
): Promise<MediaObjectRecord[]> {
  const sql = getDb();
  const rows = (await sql`
    SELECT key, folder, size_bytes, thumb_size_bytes, content_type, width, height, created_at
    FROM media_objects
    WHERE created_at < ${olderThan.toISOString()}
    ORDER BY created_at ASC
    LIMIT 500
  `) as MediaObjectRow[];

  return rows.map(mapMediaObjectRow);
}

/** Deletes multiple rows from `media_objects` by canonical key. Returns removed count. */
export async function deleteMediaObjectsByKeys(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  let removed = 0;
  for (const key of keys) {
    if (await deleteMediaObjectByKey(key)) {
      removed += 1;
    }
  }
  return removed;
}

const INLINE_BLOB_URL_RE = /https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s"'<>)]+/gi;
const INLINE_R2_KEY_RE =
  /\b(?:dev\/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:-thumb)?\.webp\b/gi;

function collectInlineMediaRefs(text: unknown, out: Set<string>): void {
  if (typeof text !== "string" || !text) return;
  for (const match of text.matchAll(INLINE_BLOB_URL_RE)) {
    out.add(match[0]);
  }
  for (const match of text.matchAll(INLINE_R2_KEY_RE)) {
    out.add(match[0].replace(/-thumb\.webp$/, ".webp"));
  }
}

/** Collects active image references across articles and gallery (columns and article content). */
export async function listReferencedImageUrls(): Promise<Set<string>> {
  const sql = getDb();
  const [articles, gallery] = await Promise.all([
    sql`SELECT thumbnail_url, content FROM articles`,
    sql`SELECT url, caption FROM gallery_images`,
  ]);

  const set = new Set<string>();
  for (const row of articles) {
    if (typeof row.thumbnail_url === "string" && row.thumbnail_url) {
      set.add(row.thumbnail_url);
    }
    collectInlineMediaRefs(row.content, set);
  }
  for (const row of gallery) {
    if (typeof row.url === "string" && row.url) {
      set.add(row.url);
    }
    collectInlineMediaRefs(row.caption, set);
  }
  return set;
}
