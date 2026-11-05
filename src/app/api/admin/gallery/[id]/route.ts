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
  async ({ params, supabase, actor }) => ({
    data: await getGalleryImage(supabase, actor, params.id),
  }),
);

export const PATCH = withApi<"admin", Params>(
  { access: "admin" },
  async ({ request, params, supabase, actor }) => ({
    data: await updateGalleryImageById(
      supabase,
      actor,
      params.id,
      await readJson(request),
    ),
  }),
);

export const DELETE = withApi<"admin", Params>(
  { access: "admin" },
  async ({ params, supabase, actor }) => ({
    data: await deleteGalleryImageById(supabase, actor, params.id),
  }),
);
