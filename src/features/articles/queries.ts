import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { ArticleDto } from "@/features/articles/schemas";
import { api, toQueryString } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/types";

export const ARTICLES_ADMIN_API = "/api/admin/articles";
export const ARTICLES_ADMIN_PATH = "/admin/articles";

export interface ArticleListParams {
  q: string;
  page: number;
}

export const articleKeys = {
  all: ["articles"] as const,
  lists: () => [...articleKeys.all, "list"] as const,
  list: (params: ArticleListParams) =>
    [...articleKeys.lists(), params] as const,
  detail: (id: string) => [...articleKeys.all, "detail", id] as const,
};

const STALE_TIME = 30_000;

/** Dipakai bersama server (prefetch, queryFn diganti service) dan client. */
export function articleListOptions(params: ArticleListParams) {
  return queryOptions({
    queryKey: articleKeys.list(params),
    queryFn: ({ signal }) =>
      api.get<Paginated<ArticleDto>>(
        `${ARTICLES_ADMIN_API}${toQueryString({ q: params.q, page: params.page })}`,
        signal,
      ),
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export function articleDetailOptions(id: string) {
  return queryOptions({
    queryKey: articleKeys.detail(id),
    queryFn: ({ signal }) =>
      api.get<ArticleDto>(`${ARTICLES_ADMIN_API}/${id}`, signal),
    staleTime: STALE_TIME,
  });
}
