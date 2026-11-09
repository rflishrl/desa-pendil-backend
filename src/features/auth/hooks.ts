"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import type { LoginInput, LoginResult } from "@/features/auth/schemas";
import { type ApiClientError, api } from "@/lib/api/client";

export function useLogin() {
  const router = useRouter();
  return useMutation<LoginResult, ApiClientError, LoginInput>({
    mutationFn: (input) => api.post<LoginResult>("/api/auth/login", input),
    onSuccess: () => {
      router.navigate({ to: "/admin", replace: true });
      router.invalidate();
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiClientError>({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => {
      // Clears admin cache on logout to prevent stale data display.
      queryClient.clear();
      router.navigate({ to: "/login", replace: true });
      router.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
}
