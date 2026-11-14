"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { type MediaStorageParams, mediaStorageOptions } from "@/features/uploads/queries";
import type { UploadFolder, UploadResult } from "@/features/uploads/schemas";
import { type ApiClientError, api } from "@/lib/api/client";

export interface UploadPhotoInput {
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export function useUploadPhoto(folder: UploadFolder) {
  return useMutation<UploadResult, ApiClientError, File | UploadPhotoInput>({
    mutationFn: (input) => {
      const file = input instanceof File ? input : input.file;
      const onProgress = input instanceof File ? undefined : input.onProgress;
      const signal = input instanceof File ? undefined : input.signal;

      const form = new FormData();
      form.set("file", file);
      form.set("folder", folder);
      return api.upload<UploadResult>("/api/upload", form, {
        onProgress,
        signal,
      });
    },
  });
}

export function useMediaStorageSummary(params: MediaStorageParams) {
  return useQuery(mediaStorageOptions(params));
}
