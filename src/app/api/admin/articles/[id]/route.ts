import {
  deleteArticle,
  getArticle,
  updateArticle,
} from "@/features/articles/service";
import { readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 10;

type Params = { id: string };

export const GET = withApi<"admin", Params>(
  { access: "admin" },
  async ({ params, actor }) => ({
    data: await getArticle({ audience: "admin", actor }, params.id),
  }),
);

export const PATCH = withApi<"admin", Params>(
  { access: "admin" },
  async ({ request, params, actor }) => ({
    data: await updateArticle(actor, params.id, await readJson(request)),
  }),
);

export const DELETE = withApi<"admin", Params>(
  { access: "admin" },
  async ({ params, actor }) => ({
    data: await deleteArticle(actor, params.id),
  }),
);
