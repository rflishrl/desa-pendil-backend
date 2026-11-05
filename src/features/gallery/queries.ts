import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { GalleryDto } from "@/features/gallery/schemas";
import { api, toQueryString } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/types";

export const GALLERY_ADMIN_API = "/api/admin/gallery";
export const GALLERY_ADMIN_PATH = "/admin/gallery";

export interface GalleryListParams {
  page: number;
}

export const galleryKeys = {
  all: ["gallery"] as const,
  lists: () => [...galleryKeys.all, "list"] as const,
  list: (params: GalleryListParams) =>
    [...galleryKeys.lists(), params] as const,
  detail: (id: string) => [...galleryKeys.all, "detail", id] as const,
};

const STALE_TIME = 30_000;

/** Shared query options for server prefetching and client cache hydration. */
export function galleryListOptions(params: GalleryListParams) {
  return queryOptions({
    queryKey: galleryKeys.list(params),
    queryFn: ({ signal }) =>
      api.get<Paginated<GalleryDto>>(
        `${GALLERY_ADMIN_API}${toQueryString({ page: params.page })}`,
        signal,
      ),
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export function galleryDetailOptions(id: string) {
  return queryOptions({
    queryKey: galleryKeys.detail(id),
    queryFn: ({ signal }) =>
      api.get<GalleryDto>(`${GALLERY_ADMIN_API}/${id}`, signal),
    staleTime: STALE_TIME,
  });
}
