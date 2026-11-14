import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import {
  MEDIA_STORAGE_DEFAULT_LIMIT,
  type MediaStorageSummaryDto,
} from "@/features/uploads/schemas";
import { api, toQueryString } from "@/lib/api/client";

export const STORAGE_ADMIN_API = "/api/admin/storage";
export const STORAGE_ADMIN_PATH = "/admin/storage";

export interface MediaStorageParams {
  page: number;
  limit?: number;
}

export const storageKeys = {
  all: ["media-storage"] as const,
  summary: (params: MediaStorageParams) => [...storageKeys.all, "summary", params] as const,
};

const STALE_TIME = 30_000;

/** Shared React Query options for the admin R2 quota & media asset monitor. */
export function mediaStorageOptions(params: MediaStorageParams) {
  const limit = params.limit ?? MEDIA_STORAGE_DEFAULT_LIMIT;
  return queryOptions({
    queryKey: storageKeys.summary({ page: params.page, limit }),
    queryFn: ({ signal }) =>
      api.get<MediaStorageSummaryDto>(
        `${STORAGE_ADMIN_API}${toQueryString({ page: params.page, limit })}`,
        signal,
      ),
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}
