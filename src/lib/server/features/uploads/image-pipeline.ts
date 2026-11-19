import sharp, { type Metadata } from 'sharp';

import { AppError } from '#lib/server/api/errors.js';

export const MAX_IMAGE_PIXELS = 50_000_000;
export const FULL_MAX_DIMENSION = 1920;
export const THUMB_MAX_DIMENSION = 480;
export const FULL_MAX_BYTES = 1_048_576;
export const FULL_QUALITY_LADDER = [80, 72, 64, 56, 48] as const;
export const THUMB_QUALITY = 78;

export type SupportedSourceMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ProcessedImageResult {
	fullBuffer: Uint8Array;
	thumbBuffer: Uint8Array;
	width: number;
	height: number;
	originalSize: number;
	fullSize: number;
	thumbSize: number;
	totalCompressedSize: number;
	savedPercent: number;
}

type DetectedKind =
	| SupportedSourceMime
	| 'image/gif'
	| 'image/svg+xml'
	| 'image/avif-or-heic'
	| 'image/tiff'
	| 'unknown';

function matchesAscii(bytes: Uint8Array, offset: number, text: string): boolean {
	if (bytes.byteLength < offset + text.length) return false;
	for (let i = 0; i < text.length; i++) {
		if (bytes[offset + i] !== text.charCodeAt(i)) return false;
	}
	return true;
}

function isSvgBytes(bytes: Uint8Array): boolean {
	const sample = new TextDecoder('utf-8', { fatal: false })
		.decode(bytes.subarray(0, 512))
		.trimStart()
		.toLowerCase();
	return sample.startsWith('<svg') || (sample.startsWith('<?xml') && sample.includes('<svg'));
}

function detectImageFormatFromBytes(bytes: Uint8Array): DetectedKind {
	if (bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return 'image/jpeg';
	}
	if (
		bytes.byteLength >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	) {
		return 'image/png';
	}
	if (matchesAscii(bytes, 0, 'RIFF') && matchesAscii(bytes, 8, 'WEBP')) {
		return 'image/webp';
	}
	if (matchesAscii(bytes, 0, 'GIF87a') || matchesAscii(bytes, 0, 'GIF89a')) {
		return 'image/gif';
	}
	if (
		(bytes.byteLength >= 4 &&
			bytes[0] === 0x49 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x2a &&
			bytes[3] === 0x00) ||
		(bytes.byteLength >= 4 &&
			bytes[0] === 0x4d &&
			bytes[1] === 0x4d &&
			bytes[2] === 0x00 &&
			bytes[3] === 0x2a)
	) {
		return 'image/tiff';
	}
	if (matchesAscii(bytes, 4, 'ftyp')) {
		const brand = String.fromCharCode(
			bytes[8] ?? 0,
			bytes[9] ?? 0,
			bytes[10] ?? 0,
			bytes[11] ?? 0
		).toLowerCase();
		if (
			brand === 'avif' ||
			brand === 'avis' ||
			brand === 'heic' ||
			brand === 'heix' ||
			brand === 'hevc' ||
			brand === 'mif1'
		) {
			return 'image/avif-or-heic';
		}
	}
	if (isSvgBytes(bytes)) {
		return 'image/svg+xml';
	}
	return 'unknown';
}

/** Checks RIFF WebP chunks for VP8X animation flag (bit 1) or ANIM/ANMF chunks. */
export function hasAnimatedWebpMarker(bytes: Uint8Array): boolean {
	if (!matchesAscii(bytes, 0, 'RIFF') || !matchesAscii(bytes, 8, 'WEBP')) {
		return false;
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let offset = 12;

	while (offset + 8 <= bytes.byteLength) {
		const chunkId = String.fromCharCode(
			bytes[offset] ?? 0,
			bytes[offset + 1] ?? 0,
			bytes[offset + 2] ?? 0,
			bytes[offset + 3] ?? 0
		);
		const chunkSize = view.getUint32(offset + 4, true);
		const dataStart = offset + 8;

		if (chunkId === 'ANIM' || chunkId === 'ANMF') {
			return true;
		}
		if (chunkId === 'VP8X' && chunkSize >= 1 && dataStart < bytes.byteLength) {
			const flags = bytes[dataStart] ?? 0;
			if ((flags & 0x02) !== 0) return true;
		}

		const paddedSize = chunkSize + (chunkSize & 1);
		const next = dataStart + paddedSize;
		if (next <= offset) break;
		offset = next;
	}

	return false;
}

const UNSUPPORTED_BY_DETECTED: Partial<Record<DetectedKind, string>> = {
	'image/gif': 'Format GIF tidak didukung. Gunakan foto JPG, PNG, atau WebP statis.',
	'image/svg+xml': 'Format SVG tidak didukung demi keamanan. Gunakan JPG, PNG, atau WebP.',
	'image/avif-or-heic':
		'Format AVIF/HEIC belum didukung server. Ubah gambar ke JPG, PNG, atau WebP terlebih dahulu.',
	'image/tiff':
		'Format TIFF belum didukung server. Ubah gambar ke JPG, PNG, atau WebP terlebih dahulu.'
};

function validateInputBytes(bytes: Uint8Array, declaredMimeType?: string): SupportedSourceMime {
	if (bytes.byteLength === 0) {
		throw new AppError('BAD_REQUEST', 'File foto tidak boleh kosong.');
	}

	const detected = detectImageFormatFromBytes(bytes);
	if (detected !== 'image/jpeg' && detected !== 'image/png' && detected !== 'image/webp') {
		const specificError = UNSUPPORTED_BY_DETECTED[detected];
		if (specificError) {
			throw new AppError('UNSUPPORTED_MEDIA_TYPE', specificError);
		}
		throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Format foto harus JPG, PNG, atau WebP statis.');
	}

	if (declaredMimeType) {
		const normalizedMime = declaredMimeType.toLowerCase();
		if (
			normalizedMime !== 'image/jpeg' &&
			normalizedMime !== 'image/png' &&
			normalizedMime !== 'image/webp'
		) {
			throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Format foto harus JPG, PNG, atau WebP statis.');
		}
		if (normalizedMime !== detected) {
			throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Isi file tidak cocok dengan format fotonya.');
		}
	}

	if (detected === 'image/webp' && hasAnimatedWebpMarker(bytes)) {
		throw new AppError(
			'UNSUPPORTED_MEDIA_TYPE',
			'WebP beranimasi tidak didukung. Gunakan gambar statis.'
		);
	}

	return detected;
}

function mapSharpError(error: unknown): AppError {
	const message = error instanceof Error ? error.message : String(error);
	if (/pixel limit|maxPixels/i.test(message)) {
		return new AppError(
			'PAYLOAD_TOO_LARGE',
			'Resolusi gambar terlalu besar (maksimal 50 megapiksel).',
			{ cause: error }
		);
	}
	return new AppError(
		'UNSUPPORTED_MEDIA_TYPE',
		'File gambar rusak atau formatnya tidak didukung server.',
		{ cause: error }
	);
}

async function readAndValidateMetadata(input: Uint8Array) {
	let meta: Metadata;
	try {
		meta = await sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
	} catch (error) {
		throw mapSharpError(error);
	}

	const format = (meta.format ?? '').toLowerCase();
	if (format === 'gif') {
		throw new AppError(
			'UNSUPPORTED_MEDIA_TYPE',
			'Format GIF tidak didukung. Gunakan foto JPG, PNG, atau WebP statis.'
		);
	}
	if (format === 'avif' || format === 'heif' || format === 'tiff') {
		throw new AppError(
			'UNSUPPORTED_MEDIA_TYPE',
			'Format AVIF/HEIC/TIFF tidak didukung server. Konversi ke JPG, PNG, atau WebP terlebih dahulu.'
		);
	}
	if (format !== 'jpeg' && format !== 'png' && format !== 'webp') {
		throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Format foto harus JPG, PNG, atau WebP statis.');
	}

	const width = meta.width ?? 0;
	const height = meta.height ?? 0;
	if (
		!Number.isFinite(width) ||
		!Number.isFinite(height) ||
		width <= 0 ||
		height <= 0 ||
		width * height > MAX_IMAGE_PIXELS
	) {
		throw new AppError(
			'PAYLOAD_TOO_LARGE',
			'Resolusi gambar terlalu besar atau tidak valid (maksimal 50 megapiksel).'
		);
	}

	return meta;
}

async function encodeFullWebp(input: Uint8Array): Promise<Uint8Array> {
	try {
		const resized = sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS })
			.rotate()
			.resize(FULL_MAX_DIMENSION, FULL_MAX_DIMENSION, {
				fit: 'inside',
				withoutEnlargement: true
			});

		for (const quality of FULL_QUALITY_LADDER) {
			const candidate = new Uint8Array(await resized.clone().webp({ quality }).toBuffer());
			if (candidate.byteLength <= FULL_MAX_BYTES) {
				return candidate;
			}
		}
	} catch (error) {
		if (error instanceof AppError) throw error;
		throw mapSharpError(error);
	}

	throw new AppError(
		'PAYLOAD_TOO_LARGE',
		'Ukuran gambar setelah kompresi WebP masih melebihi 1 MB. Perkecil resolusi atau gunakan gambar lain.'
	);
}

async function encodeThumbWebp(input: Uint8Array): Promise<Uint8Array> {
	try {
		const buf = await sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS })
			.rotate()
			.resize(THUMB_MAX_DIMENSION, THUMB_MAX_DIMENSION, {
				fit: 'inside',
				withoutEnlargement: true
			})
			.webp({ quality: THUMB_QUALITY })
			.toBuffer();
		return new Uint8Array(buf);
	} catch (error) {
		throw mapSharpError(error);
	}
}

/**
 * Validates input image bytes, applies EXIF auto-orientation (metadata stripped on encode),
 * and produces a dual-size WebP pair (`full` <= 1920px & <= 1MB, `thumb` <= 480px) via `sharp`.
 */
export async function processImagePipeline(
	input: Uint8Array,
	options?: { declaredMimeType?: string }
): Promise<ProcessedImageResult> {
	validateInputBytes(input, options?.declaredMimeType);
	await readAndValidateMetadata(input);

	const [fullBuffer, thumbBuffer] = await Promise.all([
		encodeFullWebp(input),
		encodeThumbWebp(input)
	]);

	const fullMeta = await sharp(fullBuffer).metadata();
	const originalSize = input.byteLength;
	const fullSize = fullBuffer.byteLength;
	const thumbSize = thumbBuffer.byteLength;
	const totalCompressedSize = fullSize + thumbSize;
	const savedPercent =
		originalSize > 0
			? Math.max(0, Math.round(((originalSize - totalCompressedSize) / originalSize) * 100))
			: 0;

	return {
		fullBuffer,
		thumbBuffer,
		width: fullMeta.width ?? 0,
		height: fullMeta.height ?? 0,
		originalSize,
		fullSize,
		thumbSize,
		totalCompressedSize,
		savedPercent
	};
}
