import { getArticle } from "@/features/articles/service";
import { RATE_LIMITS } from "@/lib/api/rate-limits";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 10;

/** Public: single published news item by ID or slug. Drafts and other types return 404. */
export const GET = withApi<"public", { id: string }>(
  { access: "public", rateLimit: RATE_LIMITS.publicRead },
  async ({ params }) => ({
    data: await getArticle({ audience: "public" }, params.id),
  }),
);
