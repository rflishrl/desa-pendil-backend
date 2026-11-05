import {
  deleteGalleryImageById,
  getGalleryImage,
  updateGalleryImageById,
} from "@/features/gallery/service";
import { readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 10;

type Params = { id: string };

export const GET = withApi<"admin", Params>(
  { access: "admin" },
  async ({ params, actor }) => ({
    data: await getGalleryImage(actor, params.id),
  }),
);

export const PATCH = withApi<"admin", Params>(
  { access: "admin" },
  async ({ request, params, actor }) => ({
    data: await updateGalleryImageById(
      actor,
      params.id,
      await readJson(request),
    ),
  }),
);

export const DELETE = withApi<"admin", Params>(
  { access: "admin" },
  async ({ params, actor }) => ({
    data: await deleteGalleryImageById(actor, params.id),
  }),
);
