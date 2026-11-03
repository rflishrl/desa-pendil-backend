"use client";

import { useMutation } from "@tanstack/react-query";

import type { RevalidateCheck } from "@/features/revalidate/types";
import { api, type ApiClientError } from "@/lib/api/client";

export function useCheckRevalidate() {
  return useMutation<RevalidateCheck, ApiClientError>({
    mutationFn: () => api.post<RevalidateCheck>("/api/admin/revalidate/test"),
  });
}
