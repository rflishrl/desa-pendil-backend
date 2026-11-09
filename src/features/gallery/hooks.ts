"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  GALLERY_ADMIN_API,
  GALLERY_ADMIN_PATH,
  type GalleryListParams,
  galleryDetailOptions,
  galleryKeys,
  galleryListOptions,
} from "@/features/gallery/queries";
import type { GalleryDto, GalleryFormValues } from "@/features/gallery/schemas";
import { type ApiClientError, api } from "@/lib/api/client";

export function useGalleryList(params: GalleryListParams) {
  return useQuery(galleryListOptions(params));
}

export function useGalleryImage(id: string) {
  return useQuery(galleryDetailOptions(id));
}

export function useSaveGalleryImage(id?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation<GalleryDto, ApiClientError, GalleryFormValues>({
    mutationFn: (values) =>
      id
        ? api.patch<GalleryDto>(`${GALLERY_ADMIN_API}/${id}`, values)
        : api.post<GalleryDto>(GALLERY_ADMIN_API, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: galleryKeys.all });
      toast.success(id ? "Perubahan berhasil disimpan." : "Berhasil ditambahkan.");
      router.navigate({ to: GALLERY_ADMIN_PATH });
    },
  });
}

/** Tanpa optimistic update: penghapusan permanen, jadi tunggu jawaban server. */
export function useDeleteGalleryImage() {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, ApiClientError, string>({
    mutationFn: (id) => api.delete<{ id: string }>(`${GALLERY_ADMIN_API}/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: galleryKeys.all });
      toast.success("Berhasil dihapus.");
    },
  });
}
