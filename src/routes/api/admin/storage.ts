import { createFileRoute } from "@tanstack/react-router";

import { mediaStorageQuerySchema } from "@/features/uploads/schemas";
import { getMediaStorageSummary } from "@/features/uploads/storage-service";
import { parseQuery } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";

const handleGet = withApi({ access: "admin" }, async ({ request, actor }) => ({
  data: await getMediaStorageSummary(actor, parseQuery(request, mediaStorageQuerySchema)),
}));

export const Route = createFileRoute("/api/admin/storage")({
  server: {
    handlers: {
      GET: handleGet,
    },
  },
});

export { handleGet as GET };
