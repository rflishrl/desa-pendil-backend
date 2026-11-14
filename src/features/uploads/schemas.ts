import { z } from "zod";

import type { Pagination } from "@/lib/api/types";
import type { StorageProviderKind } from "@/lib/storage/provider";

export const UPLOAD_FOLDERS = ["articles", "gallery"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

/** Multipart form payload schema for POST /api/upload. */
export const uploadFormSchema = z.object({
  folder: z.enum(UPLOAD_FOLDERS, { error: "Folder tujuan tidak valid." }),
  file: z.instanceof(File, { error: "File foto wajib dikirim." }),
});

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_MB = 4;

export const MEDIA_STORAGE_DEFAULT_LIMIT = 10;
export const MEDIA_STORAGE_MAX_LIMIT = 50;

export const mediaStorageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MEDIA_STORAGE_MAX_LIMIT)
    .catch(MEDIA_STORAGE_DEFAULT_LIMIT),
});

export type MediaStorageQuery = z.output<typeof mediaStorageQuerySchema>;

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

export type MediaQuotaStatus = "normal" | "warning" | "critical";

export interface MediaAssetItem {
  key: string;
  url: string;
  thumbUrl: string;
  folder: string;
  sizeBytes: number;
  thumbSizeBytes: number;
  totalBytes: number;
  width: number;
  height: number;
  contentType: string;
  isReferenced: boolean;
  isEligibleForCleanup: boolean;
  createdAt: string;
}

export interface MediaStorageUsageStats {
  usedBytes: number;
  fullBytes: number;
  thumbBytes: number;
  quotaMb: number;
  quotaBytes: number;
  remainingBytes: number;
  usedPercent: number;
  status: MediaQuotaStatus;
  totalCount: number;
  activeCount: number;
  orphanCount: number;
  gracePeriodOrphanCount: number;
  eligibleCleanupCount: number;
}

export interface MediaStorageSafeConfig {
  provider: StorageProviderKind;
  bucketName: string | null;
  publicDomainConfigured: boolean;
  keyPrefix: string;
  environment: string;
  quotaMb: number;
  maxUploadMb: number;
}

export interface MediaStorageSummaryDto {
  usage: MediaStorageUsageStats;
  config: MediaStorageSafeConfig;
  items: MediaAssetItem[];
  pagination: Pagination;
}
