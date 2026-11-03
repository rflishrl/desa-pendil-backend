"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  ARTICLES_ADMIN_API,
  ARTICLES_ADMIN_PATH,
  articleDetailOptions,
  articleKeys,
  articleListOptions,
  type ArticleListParams,
} from "@/features/articles/queries";
import type {
  ArticleDto,
  ArticleFormValues,
} from "@/features/articles/schemas";
import { api, type ApiClientError } from "@/lib/api/client";

export function useArticleList(params: ArticleListParams) {
  return useQuery(articleListOptions(params));
}

export function useArticle(id: string) {
  return useQuery(articleDetailOptions(id));
}

export function useSaveArticle(id?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation<ArticleDto, ApiClientError, ArticleFormValues>({
    mutationFn: (values) =>
      id
        ? api.patch<ArticleDto>(`${ARTICLES_ADMIN_API}/${id}`, values)
        : api.post<ArticleDto>(ARTICLES_ADMIN_API, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: articleKeys.all });
      toast.success(
        id ? "Perubahan berhasil disimpan." : "Berhasil ditambahkan.",
      );
      router.push(ARTICLES_ADMIN_PATH);
    },
  });
}

/** Tanpa optimistic update: penghapusan permanen, jadi tunggu jawaban server. */
export function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, ApiClientError, string>({
    mutationFn: (id) =>
      api.delete<{ id: string }>(`${ARTICLES_ADMIN_API}/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: articleKeys.all });
      toast.success("Berhasil dihapus.");
    },
  });
}
