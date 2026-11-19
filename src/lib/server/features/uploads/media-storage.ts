import { R2_PUBLIC_DOMAIN } from '$app/env/private';

import { deleteMediaObjectByKey } from '#lib/server/features/uploads/repository.js';
import { log } from '#lib/server/log.js';
import {
	deriveThumbKey,
	extractCanonicalKeyFromHttpsUrl,
	isValidMediaKey
} from '#lib/server/storage/media-url.js';
import { getR2Storage } from '#lib/server/storage/provider.js';

function resolveDeletableR2Key(keyOrUrl: string): string | null {
	if (isValidMediaKey(keyOrUrl)) return keyOrUrl;
	const extracted = extractCanonicalKeyFromHttpsUrl(keyOrUrl);
	if (!extracted) return null;

	const envDomain = process.env.VITEST
		? process.env.R2_PUBLIC_DOMAIN
		: (R2_PUBLIC_DOMAIN ?? process.env.R2_PUBLIC_DOMAIN);
	const configuredDomain = envDomain?.trim();
	if (!configuredDomain) return null;
	try {
		if (new URL(configuredDomain).origin !== extracted.origin) return null;
	} catch {
		return null;
	}
	return extracted.key;
}

/**
 * Deletes an old image from Cloudflare R2 (`full + thumb` pair and `media_objects` row).
 * Failures are non-fatal and logged.
 */
export async function deleteStoredMedia(keyOrUrl: string | null | undefined): Promise<void> {
	if (!keyOrUrl) return;

	const r2Key = resolveDeletableR2Key(keyOrUrl);
	if (!r2Key) return;

	try {
		const storage = getR2Storage();
		const thumbKey = deriveThumbKey(r2Key);
		const result = await storage.deleteObjects([r2Key, thumbKey]);
		for (const failure of result.failed) {
			log('error', 'gagal menghapus objek R2', {
				key: failure.key,
				reason: failure.message
			});
		}
		await deleteMediaObjectByKey(r2Key);
	} catch (error) {
		log('error', 'gagal menghapus media R2 lama', { key: r2Key, error });
	}
}
