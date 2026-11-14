import { MIN_ORPHAN_AGE_MS } from "@/features/uploads/cleanup-service";
import {
  getMediaUsageSummary,
  listMediaObjectEntries,
  listMediaObjectsPage,
  listReferencedImageUrls,
} from "@/features/uploads/repository";
import {
  MEDIA_STORAGE_DEFAULT_LIMIT,
  type MediaQuotaStatus,
  type MediaStorageSummaryDto,
  mediaStorageQuerySchema,
} from "@/features/uploads/schemas";
import { paginate } from "@/lib/api/types";
import type { Actor } from "@/lib/auth/actor";
import { assertAdmin } from "@/lib/auth/authorize";
import { getServerEnv, isNonProductionMediaEnv } from "@/lib/env";
import { comparableMediaRef, isValidMediaKey } from "@/lib/storage/media-key";
import { getPublicMediaUrl, getPublicThumbUrl } from "@/lib/storage/media-url";
import { getStorageProviderKind } from "@/lib/storage/provider";

const BYTES_PER_MIB = 1024 * 1024;

/** Maps quota percentage to semantic threshold status (`normal` < 70%, `warning` 70-89%, `critical` >= 90%). */
export function resolveQuotaStatus(usedPercent: number): MediaQuotaStatus {
  if (usedPercent >= 90) return "critical";
  if (usedPercent >= 70) return "warning";
  return "normal";
}

function collectReferencedCanonicalKeys(refs: ReadonlySet<string>): Set<string> {
  const keys = new Set<string>();
  for (const ref of refs) {
    const token = comparableMediaRef(ref);
    if (isValidMediaKey(token)) {
      keys.add(token);
    }
  }
  return keys;
}

function safePublicUrl(
  resolver: (key: string, domain?: string) => string,
  key: string,
  domain: string | undefined,
): string {
  if (!domain) return "";
  try {
    return resolver(key, domain);
  } catch {
    return "";
  }
}

/**
 * Returns admin-only R2 quota summary, composition breakdown, safe non-secret config,
 * and paginated `media_objects` records from Neon DB without calling R2 `ListObjectsV2`.
 */
export async function getMediaStorageSummary(
  actor: Actor | null,
  rawQuery?: unknown,
): Promise<MediaStorageSummaryDto> {
  assertAdmin(actor);

  const query = mediaStorageQuerySchema.parse(rawQuery ?? {});
  const page = query.page;
  const limit = query.limit ?? MEDIA_STORAGE_DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  const env = getServerEnv();
  const provider = getStorageProviderKind();

  const [usageSummary, entries, pageRows, referencedRefs] = await Promise.all([
    getMediaUsageSummary(),
    listMediaObjectEntries(),
    listMediaObjectsPage({ limit, offset }),
    listReferencedImageUrls(),
  ]);

  const referencedKeys = collectReferencedCanonicalKeys(referencedRefs);
  const cutoffMs = Date.now() - MIN_ORPHAN_AGE_MS;

  let activeCount = 0;
  let orphanCount = 0;
  let gracePeriodOrphanCount = 0;
  let eligibleCleanupCount = 0;

  for (const entry of entries) {
    if (referencedKeys.has(entry.key)) {
      activeCount += 1;
    } else {
      orphanCount += 1;
      const createdMs = Date.parse(entry.createdAt);
      if (Number.isFinite(createdMs) && createdMs < cutoffMs) {
        eligibleCleanupCount += 1;
      } else {
        gracePeriodOrphanCount += 1;
      }
    }
  }

  const fullBytes = usageSummary.totalBytes;
  const thumbBytes = usageSummary.totalThumbBytes;
  const usedBytes = fullBytes + thumbBytes;
  const quotaMb = env.R2_APP_QUOTA_MB;
  const quotaBytes = quotaMb * BYTES_PER_MIB;
  const remainingBytes = Math.max(0, quotaBytes - usedBytes);
  const usedPercent =
    quotaBytes > 0 ? Number(Math.min(100, (usedBytes / quotaBytes) * 100).toFixed(1)) : 0;

  const items = pageRows.map((row) => {
    const isReferenced = referencedKeys.has(row.key);
    const createdMs = Date.parse(row.createdAt);
    const isEligibleForCleanup =
      !isReferenced && Number.isFinite(createdMs) && createdMs < cutoffMs;

    return {
      key: row.key,
      url: safePublicUrl(getPublicMediaUrl, row.key, env.R2_PUBLIC_DOMAIN),
      thumbUrl: safePublicUrl(getPublicThumbUrl, row.key, env.R2_PUBLIC_DOMAIN),
      folder: row.folder,
      sizeBytes: row.sizeBytes,
      thumbSizeBytes: row.thumbSizeBytes,
      totalBytes: row.sizeBytes + row.thumbSizeBytes,
      width: row.width,
      height: row.height,
      contentType: row.contentType,
      isReferenced,
      isEligibleForCleanup,
      createdAt: row.createdAt,
    };
  });

  const paginated = paginate(items, usageSummary.totalCount, page, limit);
  const nonProd = isNonProductionMediaEnv();

  return {
    usage: {
      usedBytes,
      fullBytes,
      thumbBytes,
      quotaMb,
      quotaBytes,
      remainingBytes,
      usedPercent,
      status: resolveQuotaStatus(usedPercent),
      totalCount: usageSummary.totalCount,
      activeCount,
      orphanCount,
      gracePeriodOrphanCount,
      eligibleCleanupCount,
    },
    config: {
      provider,
      bucketName: env.R2_BUCKET_NAME ?? null,
      publicDomainConfigured: Boolean(env.R2_PUBLIC_DOMAIN),
      keyPrefix: nonProd ? "dev/" : "(root)",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      quotaMb,
      maxUploadMb: env.MAX_UPLOAD_MB,
    },
    items: paginated.items,
    pagination: paginated.pagination,
  };
}
