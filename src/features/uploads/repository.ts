import "server-only";

import { toAppError } from "@/lib/supabase/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";

/**
 * Collects active image URLs referenced in articles and gallery.
 * Requires admin client to query draft items hidden by public RLS.
 */
export async function listReferencedImageUrls(
  adminClient: AppSupabaseClient,
): Promise<Set<string>> {
  const [articles, gallery] = await Promise.all([
    adminClient.from("articles").select("thumbnail_url"),
    adminClient.from("gallery_images").select("url"),
  ]);
  if (articles.error) throw toAppError(articles.error, "memuat foto artikel");
  if (gallery.error) throw toAppError(gallery.error, "memuat foto galeri");

  const urls = [
    ...articles.data.map((row) => row.thumbnail_url),
    ...gallery.data.map((row) => row.url),
  ];
  return new Set(urls.filter((url): url is string => Boolean(url)));
}
