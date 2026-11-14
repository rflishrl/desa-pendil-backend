/** Hostname pattern for legacy assets stored on Vercel Blob. */
export const BLOB_HOSTNAME = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/;

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const CANONICAL_FULL_KEY_RE = new RegExp(`^(?:dev\\/)?${UUID_PATTERN}\\.webp$`);
const CANONICAL_OBJECT_KEY_RE = new RegExp(`^(?:dev\\/)?${UUID_PATTERN}(?:-thumb)?\\.webp$`);

/** Returns true when value is an absolute HTTP/HTTPS media URL. */
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

/** Returns true when value is an HTTPS URL hosted on Vercel Blob storage. */
export function isLegacyBlobUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && BLOB_HOSTNAME.test(parsed.hostname);
  } catch {
    return false;
  }
}

/** Extracts origin and canonical key from an HTTPS R2 public URL, or null otherwise. */
export function extractCanonicalKeyFromHttpsUrl(
  value: string,
): { origin: string; key: string } | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.search || parsed.hash) {
      return null;
    }
    const candidateKey = parsed.pathname.replace(/^\/+/, "");
    if (!isValidMediaKey(candidateKey)) return null;
    return { origin: parsed.origin, key: candidateKey };
  } catch {
    return null;
  }
}

/** Client-safe structural check for canonical keys, R2 WebP URLs, or legacy Blob URLs. */
export function isAcceptedMediaInput(value: string): boolean {
  return (
    isValidMediaKey(value) ||
    isLegacyBlobUrl(value) ||
    extractCanonicalKeyFromHttpsUrl(value) !== null
  );
}

/** Normalizes R2 HTTPS URLs and canonical keys to the same comparison token. */
export function comparableMediaRef(value: string): string {
  return extractCanonicalKeyFromHttpsUrl(value)?.key ?? value;
}
