export const CLIENT_MAX_BYTES = Math.floor(3.5 * 1024 * 1024);
export const CLIENT_HARD_LIMIT_BYTES = 4 * 1024 * 1024;
export const CLIENT_MAX_DIMENSION = 2560;

const CLIENT_SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55] as const;

export interface PrepareImageResult {
	file: File;
	didShrink: boolean;
	originalSize: number;
	preparedSize: number;
}

interface DecodedImage {
	source: CanvasImageSource;
	width: number;
	height: number;
	cleanup: () => void;
}

function fitDimensions(
	width: number,
	height: number,
	maxSide: number
): { width: number; height: number } {
	if (width <= maxSide && height <= maxSide) {
		return { width, height };
	}
	const scale = maxSide / Math.max(width, height);
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}

function renameWithExtension(filename: string, ext: string): string {
	const base = filename.replace(/\.[^/.]+$/, '') || 'image';
	return `${base}.${ext}`;
}

async function decodeImageSource(file: File): Promise<DecodedImage> {
	if (typeof createImageBitmap === 'function') {
		try {
			const bitmap = await createImageBitmap(file, {
				imageOrientation: 'from-image'
			});
			return {
				source: bitmap,
				width: bitmap.width,
				height: bitmap.height,
				cleanup: () => bitmap.close()
			};
		} catch {
			// Fallback ke HTMLImageElement jika browser menolak opsi imageOrientation.
		}
	}

	const objectUrl = URL.createObjectURL(file);
	try {
		const img = new Image();
		img.src = objectUrl;
		await img.decode();
		return {
			source: img,
			width: img.naturalWidth || img.width,
			height: img.naturalHeight || img.height,
			cleanup: () => URL.revokeObjectURL(objectUrl)
		};
	} catch (error) {
		URL.revokeObjectURL(objectUrl);
		throw new Error('Gambar gagal dibaca oleh browser.', { cause: error });
	}
}

async function renderToBlob(
	source: CanvasImageSource,
	width: number,
	height: number,
	mimeType: 'image/webp' | 'image/jpeg',
	quality: number
): Promise<Blob> {
	if (typeof OffscreenCanvas !== 'undefined') {
		const canvas = new OffscreenCanvas(width, height);
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Konteks kanvas 2D tidak tersedia.');
		ctx.drawImage(source, 0, 0, width, height);
		return canvas.convertToBlob({ type: mimeType, quality });
	}

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Konteks kanvas 2D tidak tersedia.');
	ctx.drawImage(source, 0, 0, width, height);

	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('Gagal mengonversi gambar di browser.'));
					return;
				}
				resolve(blob);
			},
			mimeType,
			quality
		);
	});
}

async function encodeWithinLimit(
	source: CanvasImageSource,
	width: number,
	height: number
): Promise<Blob> {
	let targetFormat: 'image/webp' | 'image/jpeg' = 'image/webp';

	const probe = await renderToBlob(source, width, height, 'image/webp', QUALITY_STEPS[0]);
	if (probe.type === 'image/webp') {
		if (probe.size <= CLIENT_MAX_BYTES) return probe;
	} else {
		targetFormat = 'image/jpeg';
	}

	let bestBlob: Blob = probe;
	const startIndex = targetFormat === 'image/webp' ? 1 : 0;

	for (let i = startIndex; i < QUALITY_STEPS.length; i++) {
		const quality = QUALITY_STEPS[i];
		if (quality === undefined) continue;
		const candidate = await renderToBlob(source, width, height, targetFormat, quality);
		bestBlob = candidate;
		if (candidate.size <= CLIENT_MAX_BYTES) {
			return candidate;
		}
	}

	const smaller = fitDimensions(width, height, Math.round(Math.max(width, height) * 0.75));
	if (smaller.width < width || smaller.height < height) {
		bestBlob = await renderToBlob(source, smaller.width, smaller.height, targetFormat, 0.6);
	}

	return bestBlob;
}

/**
 * Shrinks oversized JPEG/PNG/WebP files client-side so payloads fit comfortably
 * inside Vercel's 4.5 MB request limit before server-side `sharp` WebP conversion.
 */
export async function prepareImageForUpload(file: File): Promise<PrepareImageResult> {
	const originalSize = file.size;
	if (originalSize <= CLIENT_MAX_BYTES && CLIENT_SUPPORTED_TYPES.has(file.type)) {
		return {
			file,
			didShrink: false,
			originalSize,
			preparedSize: originalSize
		};
	}

	if (!CLIENT_SUPPORTED_TYPES.has(file.type)) {
		throw new Error('Format foto harus JPG, PNG, atau WebP.');
	}

	const decoded = await decodeImageSource(file);
	try {
		const { width, height } = fitDimensions(decoded.width, decoded.height, CLIENT_MAX_DIMENSION);
		const blob = await encodeWithinLimit(decoded.source, width, height);

		if (blob.size > CLIENT_HARD_LIMIT_BYTES) {
			throw new Error(
				'Ukuran foto masih melebihi batas 4 MB setelah dikompresi. Gunakan foto beresolusi lebih kecil.'
			);
		}

		const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
		const preparedFile = new File([blob], renameWithExtension(file.name, extension), {
			type: blob.type || 'image/jpeg',
			lastModified: file.lastModified
		});

		return {
			file: preparedFile,
			didShrink: true,
			originalSize,
			preparedSize: preparedFile.size
		};
	} finally {
		decoded.cleanup();
	}
}
