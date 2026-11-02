import { ARTICLE_STATUSES, ARTICLE_TYPES } from "@/db/schema";
import { getSession, requireAdminApi } from "@/lib/auth/session";
import { ApiError, handle, json, parsePage, preflight, withCors } from "@/lib/http";
import { articleInputSchema } from "@/lib/validation";
import { createArticle, listArticles, toArticleDto } from "@/services/articles";

export const dynamic = "force-dynamic";

function oneOf<T extends readonly string[]>(list: T, value: string | null): T[number] | undefined {
  return value && (list as readonly string[]).includes(value) ? (value as T[number]) : undefined;
}

/**
 * GET /api/v1/articles?type=&q=&page=&limit=
 * Public callers only see published items. Admins may add `status=draft|published`
 * (or `status=all` implicitly by omitting it) to see everything.
 */
export function GET(request: Request) {
  return handle(async () => {
    const { searchParams } = new URL(request.url);
    const isAdmin = Boolean(await getSession());
    if (searchParams.has("status") && !isAdmin) throw new ApiError(401, "Unauthorized");

    const result = await listArticles({
      type: oneOf(ARTICLE_TYPES, searchParams.get("type")),
      status: oneOf(ARTICLE_STATUSES, searchParams.get("status")),
      q: searchParams.get("q")?.trim() || undefined,
      page: parsePage(searchParams.get("page")),
      limit: parsePage(searchParams.get("limit"), 10),
      publicOnly: !isAdmin,
    });

    const response = json({
      data: result.items.map(toArticleDto),
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
    return withCors(request, response);
  });
}

/** POST /api/v1/articles — create (admin session required). */
export function POST(request: Request) {
  return handle(async () => {
    await requireAdminApi();
    const body = articleInputSchema.parse(await request.json().catch(() => null));
    const article = await createArticle(body);
    return json({ data: toArticleDto(article) }, { status: 201 });
  });
}

export const OPTIONS = preflight;
