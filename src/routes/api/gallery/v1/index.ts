import { createFileRoute } from "@tanstack/react-router";

import { listGalleryFor } from "@/features/gallery/service";
import { RATE_LIMITS } from "@/lib/api/rate-limits";
import { parseQuery } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";
import { listQuerySchema } from "@/lib/schemas/common";

const handleGet = withApi(
  {
    access: "public",
    rateLimit: RATE_LIMITS.publicRead,
    cacheControl: "public, s-maxage=60, stale-while-revalidate=300",
  },
  async ({ request }) => ({
    data: await listGalleryFor({ audience: "public" }, parseQuery(request, listQuerySchema(50))),
  }),
);

export const Route = createFileRoute("/api/gallery/v1/")({
  server: {
    handlers: {
      GET: handleGet,
    },
  },
});

export { handleGet as GET };
