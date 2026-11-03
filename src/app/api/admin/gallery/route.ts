import {
  createGalleryImage,
  listGalleryFor,
} from "@/features/gallery/service";
import { parseQuery, readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";
import { listQuerySchema } from "@/lib/schemas/common";

export const maxDuration = 10;

/** Admin: semua foto galeri (12 per halaman). */
export const GET = withApi(
  { access: "admin" },
  async ({ request, supabase, actor }) => ({
    data: await listGalleryFor(
      supabase,
      { audience: "admin", actor },
      parseQuery(request, listQuerySchema(12)),
    ),
  }),
);

export const POST = withApi(
  { access: "admin" },
  async ({ request, supabase, actor }) => ({
    data: await createGalleryImage(supabase, actor, await readJson(request)),
    status: 201,
  }),
);
