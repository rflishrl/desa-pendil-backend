import { createFileRoute } from "@tanstack/react-router";

import { checkHealth } from "@/features/health/service";
import { RATE_LIMITS } from "@/lib/api/rate-limits";
import { withApi } from "@/lib/api/with-api";

const handleGet = withApi({ access: "public", rateLimit: RATE_LIMITS.health }, async () => ({
  data: await checkHealth(),
}));

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: handleGet,
    },
  },
});

export { handleGet as GET };
