import { createArticle, listArticlesFor } from "@/features/articles/service";
import { parseQuery, readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";
import { listQuerySchema } from "@/lib/schemas/common";

export const maxDuration = 10;

/** Admin: all content types, including drafts (10 per page). */
export const GET = withApi({ access: "admin" }, async ({ request, actor }) => ({
  data: await listArticlesFor(
    { audience: "admin", actor },
    parseQuery(request, listQuerySchema(10)),
  ),
}));

export const POST = withApi(
  { access: "admin" },
  async ({ request, actor }) => ({
    data: await createArticle(actor, await readJson(request)),
    status: 201,
  }),
);
