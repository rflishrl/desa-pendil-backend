import { ApiError, handle, json, preflight, withCors } from "@/lib/http";
import { findArticle, toLegacyNews } from "@/services/articles";

export const dynamic = "force-dynamic";

/** GET /v1/news/:idOrSlug — a single published berita. */
export function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const article = await findArticle(id);
    const visible =
      article &&
      article.type === "berita" &&
      article.status === "published" &&
      article.publishedAt &&
      article.publishedAt <= new Date();
    if (!article || !visible) throw new ApiError(404, "Berita tidak ditemukan");

    const response = json({ data: toLegacyNews(article) });
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return withCors(request, response);
  });
}

export const OPTIONS = preflight;
