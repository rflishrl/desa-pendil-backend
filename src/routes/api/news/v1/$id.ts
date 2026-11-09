import { createFileRoute } from "@tanstack/react-router";

import { getArticle } from "@/features/articles/service";
import { RATE_LIMITS } from "@/lib/api/rate-limits";
import { withApi } from "@/lib/api/with-api";

const handleGet = withApi<"public", { id: string }>(
  {
    access: "public",
    rateLimit: RATE_LIMITS.publicRead,
    cacheControl: "public, s-maxage=60, stale-while-revalidate=300",
  },
  async ({ params }) => ({
    data: await getArticle({ audience: "public" }, params.id),
  }),
);

export const Route = createFileRoute("/api/news/v1/$id")({
  server: {
    handlers: {
      GET: handleGet,
    },
  },
});

export { handleGet as GET };
