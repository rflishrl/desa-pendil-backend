import "server-only";

import { getDb } from "@/lib/db/client";

/** Collects active image URLs referenced in articles and gallery. */
export async function listReferencedImageUrls(): Promise<Set<string>> {
  const sql = getDb();
  const [articles, gallery] = await Promise.all([
    sql`SELECT thumbnail_url FROM articles WHERE thumbnail_url IS NOT NULL`,
    sql`SELECT url FROM gallery_images WHERE url IS NOT NULL`,
  ]);

  const urls = [
    ...(articles as unknown as { thumbnail_url: string }[]).map(
      (r) => r.thumbnail_url,
    ),
    ...(gallery as unknown as { url: string }[]).map((r) => r.url),
  ];
  return new Set(urls.filter((url): url is string => Boolean(url)));
}
