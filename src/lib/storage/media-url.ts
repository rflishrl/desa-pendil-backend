import { AppError } from "@/lib/api/errors";
import { ConfigError, isNonProductionMediaEnv } from "@/lib/env";
import {
  BLOB_HOSTNAME,
  extractCanonicalKeyFromHttpsUrl,
  isAcceptedMediaInput,
  isLegacyBlobUrl,
  isLegacyMediaUrl,
  isValidMediaKey,
  isValidObjectKey,
} from "@/lib/storage/media-key";

export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export {
  BLOB_HOSTNAME,
  extractCanonicalKeyFromHttpsUrl,
  isAcceptedMediaInput,
  isLegacyBlobUrl,
  isLegacyMediaUrl,
  isValidMediaKey,
  isValidObjectKey,
};

/** Throws AppError("BAD_REQUEST") if canonical full-size media key is invalid. */
export function assertValidMediaKey(key: string): string {
  if (!isValidMediaKey(key)) {
    throw new AppError("BAD_REQUEST", "Key media tidak valid.");
  }
  return key;
}

/** Throws AppError("BAD_REQUEST") if object key (`full` or `thumb`) is invalid. */
export function assertValidObjectKey(key: string): string {
  if (!isValidObjectKey(key)) {
    throw new AppError("BAD_REQUEST", "Key objek media tidak valid.");
  }
  return key;
}

/** Derives deterministic thumbnail object key (`<uuid>-thumb.webp`) from a canonical full key. */
export function deriveThumbKey(fullKey: string): string {
  assertValidMediaKey(fullKey);
  return fullKey.replace(/\.webp$/, "-thumb.webp");
}

/** Generates canonical full-size UUID WebP key, adding `dev/` prefix outside production. */
export function generateMediaKey(nonProd = isNonProductionMediaEnv()): string {
  const uuid = crypto.randomUUID().toLowerCase();
  return nonProd ? `dev/${uuid}.webp` : `${uuid}.webp`;
}

function resolvePublicMediaDomain(explicitDomain?: string): string {
  const raw = (explicitDomain ?? process.env.R2_PUBLIC_DOMAIN)?.trim();
  if (!raw) {
    throw new ConfigError("R2_PUBLIC_DOMAIN belum dikonfigurasi.");
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ConfigError("R2_PUBLIC_DOMAIN bukan URL yang valid.");
  }
  if (parsed.protocol !== "https:") {
    throw new ConfigError("R2_PUBLIC_DOMAIN harus memakai skema https://.");
  }
  return raw.replace(/\/+$/, "");
}

/**
 * Builds the public absolute URL for the `full` image from a stored key.
 * Preserves empty strings and legacy `http(s)://` URLs during transition.
 */
export function getPublicMediaUrl(keyOrUrl: string, explicitDomain?: string): string {
  if (!keyOrUrl) return "";
  if (isLegacyMediaUrl(keyOrUrl)) return keyOrUrl;
  const key = assertValidMediaKey(keyOrUrl);
  return `${resolvePublicMediaDomain(explicitDomain)}/${key}`;
}

/**
 * Builds the public absolute URL for the `thumb` (`480px`) variant from a stored key.
 * Returns legacy `http(s)://` URLs unchanged during transition so existing cards keep working.
 */
export function getPublicThumbUrl(keyOrUrl: string, explicitDomain?: string): string {
  if (!keyOrUrl) return "";
  if (isLegacyMediaUrl(keyOrUrl)) return keyOrUrl;
  const thumbKey = deriveThumbKey(keyOrUrl);
  return `${resolvePublicMediaDomain(explicitDomain)}/${thumbKey}`;
}

/**
 * Normalizes an incoming media reference (`url` or canonical key) for DB persistence.
 * Strips the configured `R2_PUBLIC_DOMAIN` prefix into a canonical UUID WebP key while
 * keeping legacy Vercel Blob URLs intact during transition.
 */
export function normalizeMediaInputForStorage(value: string, explicitDomain?: string): string {
  if (!value) return "";
  if (isLegacyBlobUrl(value) || isValidMediaKey(value)) return value;

  const extracted = extractCanonicalKeyFromHttpsUrl(value);
  if (!extracted) {
    throw new AppError("VALIDATION", "Alamat foto tidak berasal dari penyimpanan yang diizinkan.");
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(resolvePublicMediaDomain(explicitDomain)).origin;
  } catch (error) {
    throw new AppError("VALIDATION", "Domain media R2 belum dikonfigurasi untuk menerima URL R2.", {
      cause: error,
    });
  }
  if (extracted.origin !== expectedOrigin) {
    throw new AppError("VALIDATION", "Alamat foto tidak berasal dari domain media aplikasi.");
  }
  return extracted.key;
}
