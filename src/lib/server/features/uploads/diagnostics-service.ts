import sharp from 'sharp';

import type { Actor } from '#lib/server/auth/actor.js';
import { assertAdmin } from '#lib/server/auth/authorize.js';

const SAMPLE_PNG_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export interface ImageDiagnosticsResult {
	ok: boolean;
	runtime: 'bun' | 'node';
	sharpVersion: string | null;
	hasSharp: boolean;
	outputBytes: number;
	durationMs: number;
	error?: string;
}

function isWebpBytes(bytes: Uint8Array): boolean {
	return (
		bytes.byteLength >= 12 &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	);
}

/**
 * Smoke-tests the active Node.js runtime and `sharp` WebP encoding.
 */
export async function runImageDiagnostics(actor: Actor | null): Promise<ImageDiagnosticsResult> {
	assertAdmin(actor);

	const startedAt = performance.now();
	const runtime = process.versions?.bun ? 'bun' : 'node';
	const sharpVersion = sharp.versions?.sharp ?? null;

	try {
		const sample = Buffer.from(SAMPLE_PNG_BASE64, 'base64');
		const encoded = await sharp(sample)
			.rotate()
			.resize(1, 1, { fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 80 })
			.toBuffer();

		return {
			ok: isWebpBytes(encoded),
			runtime,
			sharpVersion,
			hasSharp: true,
			outputBytes: encoded.byteLength,
			durationMs: Math.round(performance.now() - startedAt)
		};
	} catch (error) {
		return {
			ok: false,
			runtime,
			sharpVersion,
			hasSharp: false,
			outputBytes: 0,
			durationMs: Math.round(performance.now() - startedAt),
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
