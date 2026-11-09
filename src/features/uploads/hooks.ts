"use client";

import { useMutation } from "@tanstack/react-query";

import type { UploadFolder, UploadResult } from "@/features/uploads/schemas";
import { type ApiClientError, api } from "@/lib/api/client";

export function useUploadPhoto(folder: UploadFolder) {
  return useMutation<UploadResult, ApiClientError, File>({
    mutationFn: (file) => {
      const form = new FormData();
      form.set("file", file);
      form.set("folder", folder);
      return api.upload<UploadResult>("/api/upload", form);
    },
  });
}
