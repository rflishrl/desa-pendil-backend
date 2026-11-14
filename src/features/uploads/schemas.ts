import { z } from "zod";

export const UPLOAD_FOLDERS = ["articles", "gallery"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

/** Multipart form payload schema for POST /api/upload. */
export const uploadFormSchema = z.object({
  folder: z.enum(UPLOAD_FOLDERS, { error: "Folder tujuan tidak valid." }),
  file: z.instanceof(File, { error: "File foto wajib dikirim." }),
});

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_MB = 4;

export interface UploadMetrics {
  originalSize: number;
  fullSize: number;
  thumbSize: number;
  totalCompressedSize: number;
  savedPercent: number;
  width: number;
  height: number;
}

export interface UploadResult {
  url: string;
  key?: string;
  thumbUrl?: string;
  metrics?: UploadMetrics;
}
