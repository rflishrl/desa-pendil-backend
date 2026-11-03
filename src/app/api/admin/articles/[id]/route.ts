import {
  deleteArticleById,
  getArticle,
  updateArticleById,
} from "@/features/articles/service";
import { readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 10;

type Params = { id: string };

export const GET = withApi<"admin", Params>(
  { access: "admin" },
  async ({ params, supabase, actor }) => ({
    data: await getArticle(supabase, { audience: "admin", actor }, params.id),
  }),
);

export const PATCH = withApi<"admin", Params>(
  { access: "admin" },
  async ({ request, params, supabase, actor }) => ({
    data: await updateArticleById(
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
    data: await deleteArticleById(supabase, actor, params.id),
  }),
);
