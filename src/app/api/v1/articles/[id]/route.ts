import { getSession, requireAdminApi } from "@/lib/auth/session";
import { ApiError, handle, json, preflight, withCors } from "@/lib/http";
import { articlePatchSchema } from "@/lib/validation";
import { deleteArticle, getArticleOrThrow, toArticleDto, updateArticle } from "@/services/articles";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function GET(request: Request, ctx: Ctx) {
  return handle(async () => {
    const { id } = await ctx.params;
    const article = await getArticleOrThrow(id);
    const isPublic = article.status === "published" && article.publishedAt && article.publishedAt <= new Date();
    if (!isPublic && !(await getSession())) throw new ApiError(404, "Artikel tidak ditemukan");
    return withCors(request, json({ data: toArticleDto(article) }));
  });
}

export function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdminApi();
    const { id } = await ctx.params;
    const patch = articlePatchSchema.parse(await request.json().catch(() => null));
    const article = await updateArticle((await getArticleOrThrow(id)).id, patch);
    return json({ data: toArticleDto(article) });
  });
}

export function DELETE(_request: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdminApi();
    const { id } = await ctx.params;
    await deleteArticle((await getArticleOrThrow(id)).id);
    return new Response(null, { status: 204 });
  });
}

export const OPTIONS = preflight;
