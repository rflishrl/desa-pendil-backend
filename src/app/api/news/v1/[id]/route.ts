import { getArticle } from "@/features/articles/service";
import { RATE_LIMITS } from "@/lib/api/rate-limits";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 10;

/** Publik: satu berita yang terbit, lewat id atau slug. Draf dan jenis lain dijawab 404. */
export const GET = withApi<"public", { id: string }>(
  { access: "public", rateLimit: RATE_LIMITS.publicRead },
  async ({ params, supabase }) => ({
    data: await getArticle(supabase, { audience: "public" }, params.id),
  }),
);
