import {
  createArticle,
  listArticlesFor,
} from "@/features/articles/service";
import { parseQuery, readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";
import { listQuerySchema } from "@/lib/schemas/common";

export const maxDuration = 10;

/** Admin: semua jenis konten, termasuk draf (10 per halaman). */
export const GET = withApi(
  { access: "admin" },
  async ({ request, supabase, actor }) => ({
    data: await listArticlesFor(
      supabase,
      { audience: "admin", actor },
      parseQuery(request, listQuerySchema(10)),
    ),
  }),
);

export const POST = withApi(
  { access: "admin" },
  async ({ request, supabase, actor }) => ({
    data: await createArticle(supabase, actor, await readJson(request)),
    status: 201,
  }),
);
