import { listGalleryFor } from "@/features/gallery/service";
import { RATE_LIMITS } from "@/lib/api/rate-limits";
import { parseQuery } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";
import { listQuerySchema } from "@/lib/schemas/common";

export const maxDuration = 10;

/** Public: ordered gallery photos (?page=&limit=). */
export const GET = withApi(
  { access: "public", rateLimit: RATE_LIMITS.publicRead },
  async ({ request }) => ({
    data: await listGalleryFor(
      { audience: "public" },
      parseQuery(request, listQuerySchema(50)),
    ),
  }),
);
