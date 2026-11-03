"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { LoginInput, LoginResult } from "@/features/auth/schemas";
import { api, type ApiClientError } from "@/lib/api/client";

export function useLogin() {
  const router = useRouter();
  return useMutation<LoginResult, ApiClientError, LoginInput>({
    mutationFn: (input) => api.post<LoginResult>("/api/auth/login", input),
    onSuccess: () => {
      router.replace("/admin");
      router.refresh();
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiClientError>({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => {
      // Data admin di cache browser dibuang supaya tidak terlihat setelah keluar.
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });
}
