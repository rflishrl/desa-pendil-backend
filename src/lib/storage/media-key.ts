const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const CANONICAL_FULL_KEY_RE = new RegExp(`^(?:dev\\/)?${UUID_PATTERN}\\.webp$`);
const CANONICAL_OBJECT_KEY_RE = new RegExp(`^(?:dev\\/)?${UUID_PATTERN}(?:-thumb)?\\.webp$`);

/** Validates canonical stored full-size key format (`<uuid>.webp` or `dev/<uuid>.webp`). */
export function isValidMediaKey(key: string): boolean {
	return CANONICAL_FULL_KEY_RE.test(key);
}

/** Validates any canonical R2 object key (`full` or `-thumb`, with optional `dev/` prefix). */
export function isValidObjectKey(key: string): boolean {
	return CANONICAL_OBJECT_KEY_RE.test(key);
}

/** Extracts origin and canonical key from an HTTPS R2 public URL, or null otherwise. */
export function extractCanonicalKeyFromHttpsUrl(
	value: string
): { origin: string; key: string } | null {
	try {
		const parsed = new URL(value);
		if (parsed.protocol !== 'https:' || parsed.search || parsed.hash) {
			return null;
		}
		const candidateKey = parsed.pathname.replace(/^\/+/, '');
		if (!isValidMediaKey(candidateKey)) return null;
		return { origin: parsed.origin, key: candidateKey };
	} catch {
		return null;
	}
}

/** Client-safe structural check for canonical keys or R2 WebP URLs. */
export function isAcceptedMediaInput(value: string): boolean {
	return isValidMediaKey(value) || extractCanonicalKeyFromHttpsUrl(value) !== null;
}

/** Normalizes R2 HTTPS URLs and canonical keys to the same comparison token. */
export function comparableMediaRef(value: string): string {
	return extractCanonicalKeyFromHttpsUrl(value)?.key ?? value;
}
