import { createFileRoute } from "@tanstack/react-router";

import {
  deleteGalleryImageById,
  getGalleryImage,
  updateGalleryImageById,
} from "@/features/gallery/service";
import { readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";

type Params = { id: string };

const handleGet = withApi<"admin", Params>({ access: "admin" }, async ({ params, actor }) => ({
  data: await getGalleryImage(actor, params.id),
}));

const handlePatch = withApi<"admin", Params>(
  { access: "admin" },
  async ({ request, params, actor }) => ({
    data: await updateGalleryImageById(actor, params.id, await readJson(request)),
  }),
);

const handleDelete = withApi<"admin", Params>({ access: "admin" }, async ({ params, actor }) => ({
  data: await deleteGalleryImageById(actor, params.id),
}));

export const Route = createFileRoute("/api/admin/gallery/$id")({
  server: {
    handlers: {
      GET: handleGet,
      PATCH: handlePatch,
      DELETE: handleDelete,
    },
  },
});

export { handleDelete as DELETE, handleGet as GET, handlePatch as PATCH };
