import { createFileRoute } from "@tanstack/react-router";

import { cleanupOrphanMedia } from "@/features/uploads/cleanup-service";
import { withApi } from "@/lib/api/with-api";

const handleGet = withApi({ access: "public" }, async ({ request }) => ({
  data: await cleanupOrphanMedia(request.headers.get("authorization")),
}));

export const Route = createFileRoute("/api/cron/cleanup-media")({
  server: {
    handlers: {
      GET: handleGet,
    },
  },
});

export { handleGet as GET };
