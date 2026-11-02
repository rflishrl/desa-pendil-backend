import { json, handle, parsePage, preflight, withCors } from "@/lib/http";
import { listArticles, toLegacyNews } from "@/services/articles";

export const dynamic = "force-dynamic";

/**
 * GET /v1/news — drop-in replacement for the old API the frontend reads.
 * Response: { data: [{ id, judul, isi, author, thumbnail, createdAt, ... }], meta }
 */
export function GET(request: Request) {
  return handle(async () => {
    const { searchParams } = new URL(request.url);
    const result = await listArticles({
      type: "berita",
      publicOnly: true,
      q: searchParams.get("q")?.trim() || undefined,
      page: parsePage(searchParams.get("page")),
      limit: parsePage(searchParams.get("limit"), 50),
    });

    const response = json({
      data: result.items.map(toLegacyNews),
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return withCors(request, response);
  });
}

export const OPTIONS = preflight;
