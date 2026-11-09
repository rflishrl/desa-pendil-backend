import { createFileRoute } from "@tanstack/react-router";

import { createGalleryImage, listGalleryFor } from "@/features/gallery/service";
import { parseQuery, readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";
import { listQuerySchema } from "@/lib/schemas/common";

const handleGet = withApi({ access: "admin" }, async ({ request, actor }) => ({
  data: await listGalleryFor(
    { audience: "admin", actor },
    parseQuery(request, listQuerySchema(12)),
  ),
}));

const handlePost = withApi({ access: "admin" }, async ({ request, actor }) => ({
  data: await createGalleryImage(actor, await readJson(request)),
  status: 201,
}));

export const Route = createFileRoute("/api/admin/gallery/")({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
});

export { handleGet as GET, handlePost as POST };
