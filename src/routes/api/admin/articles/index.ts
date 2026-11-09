import { createFileRoute } from "@tanstack/react-router";

import { createArticle, listArticlesFor } from "@/features/articles/service";
import { parseQuery, readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";
import { listQuerySchema } from "@/lib/schemas/common";

const handleGet = withApi({ access: "admin" }, async ({ request, actor }) => ({
  data: await listArticlesFor(
    { audience: "admin", actor },
    parseQuery(request, listQuerySchema(10)),
  ),
}));

const handlePost = withApi({ access: "admin" }, async ({ request, actor }) => ({
  data: await createArticle(actor, await readJson(request)),
  status: 201,
}));

export const Route = createFileRoute("/api/admin/articles/")({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
});

export { handleGet as GET, handlePost as POST };
