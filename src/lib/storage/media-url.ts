import { AppError } from "@/lib/api/errors";
import { ConfigError, isNonProductionMediaEnv } from "@/lib/env";

export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const CANONICAL_FULL_KEY_RE = new RegExp(`^(?:dev\\/)?${UUID_PATTERN}\\.webp$`);
const CANONICAL_OBJECT_KEY_RE = new RegExp(`^(?:dev\\/)?${UUID_PATTERN}(?:-thumb)?\\.webp$`);

/** Returns true when value is a legacy absolute HTTP/HTTPS media URL. */
export function isLegacyMediaUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Validates canonical stored full-size key format (`<uuid>.webp` or `dev/<uuid>.webp`). */
export function isValidMediaKey(key: string): boolean {
  return CANONICAL_FULL_KEY_RE.test(key);
}

/** Validates any canonical R2 object key (`full` or `-thumb`, with optional `dev/` prefix). */
export function isValidObjectKey(key: string): boolean {
  return CANONICAL_OBJECT_KEY_RE.test(key);
}

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
