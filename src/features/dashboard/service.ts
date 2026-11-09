import { countArticles } from "@/features/articles/repository";
import { countGalleryImages } from "@/features/gallery/repository";
import type { Actor } from "@/lib/auth/actor";
import { assertAdmin } from "@/lib/auth/authorize";

export interface DashboardCounts {
  articles: number;
  published: number;
  gallery: number;
}

/** Aggregate counts for admin dashboard queried concurrently. */
export async function getDashboardCounts(actor: Actor | null): Promise<DashboardCounts> {
  assertAdmin(actor);
  const [articles, published, gallery] = await Promise.all([
    countArticles(),
    countArticles("published"),
    countGalleryImages(),
  ]);
  return { articles, published, gallery };
}
