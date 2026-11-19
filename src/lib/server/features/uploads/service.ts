import { type UploadResult, uploadFormSchema } from '#lib/features/uploads/schemas.js';
import { AppError } from '#lib/server/api/errors.js';
import type { Actor } from '#lib/server/auth/actor.js';
import { assertAdmin } from '#lib/server/auth/authorize.js';
import { getServerEnv } from '#lib/server/env.js';
import { processImagePipeline } from '#lib/server/features/uploads/image-pipeline.js';
import {
	getMediaUsageSummary,
	insertMediaObject
} from '#lib/server/features/uploads/repository.js';
import { log } from '#lib/server/log.js';
import {
	deriveThumbKey,
	generateMediaKey,
	getPublicMediaUrl,
	getPublicThumbUrl,
	IMMUTABLE_CACHE_CONTROL
} from '#lib/server/storage/media-url.js';
import { getR2Storage } from '#lib/server/storage/provider.js';

const BYTES_PER_MIB = 1024 * 1024;

async function rollbackObjects(keys: string[]): Promise<void> {
	try {
		const storage = getR2Storage();
		const result = await storage.deleteObjects(keys);
		if (result.failed.length > 0) {
			log('error', 'rollback sebagian objek R2 gagal', {
				failed: result.failed
			});
		}
	} catch (error) {
		log('error', 'rollback objek R2 gagal', { keys, error });
	}
}

/**
 * Uploads a single image file to Cloudflare R2.
 * Processes the image with `sharp` into `full` and `thumb` WebP variants,
 * enforces app quota, uploads both objects with atomic rollback on failure, and tracks in DB.
 */
export async function uploadPhoto(
	actor: Actor | null,
	form: FormData,
	requestId?: string
): Promise<UploadResult> {
	assertAdmin(actor);
	const { folder, file } = uploadFormSchema.parse({
		folder: form.get('folder'),
		file: form.get('file')
	});

	const env = getServerEnv();
	const maxBytes = env.MAX_UPLOAD_MB * BYTES_PER_MIB;
	if (file.size === 0) {
		throw new AppError('BAD_REQUEST', 'File foto tidak boleh kosong.');
	}
	if (file.size > maxBytes) {
		throw new AppError('PAYLOAD_TOO_LARGE', `Ukuran foto maksimal ${env.MAX_UPLOAD_MB} MB.`);
	}

	const inputBytes = new Uint8Array(await file.arrayBuffer());
	const processed = await processImagePipeline(inputBytes, {
		declaredMimeType: file.type
	});

	const quotaBytes = env.R2_APP_QUOTA_MB * BYTES_PER_MIB;
	const usage = await getMediaUsageSummary();
	const currentUsed = usage.totalBytes + usage.totalThumbBytes;
	if (currentUsed + processed.totalCompressedSize > quotaBytes) {
		throw new AppError(
			'PAYLOAD_TOO_LARGE',
			'Kuota penyimpanan media R2 aplikasi penuh. Hapus media lama terlebih dahulu.'
		);
	}

	const key = generateMediaKey();
	const thumbKey = deriveThumbKey(key);
	const storage = getR2Storage();

	await storage.putObject({
		key,
		body: processed.fullBuffer,
		contentType: 'image/webp',
		cacheControl: IMMUTABLE_CACHE_CONTROL
	});

	try {
		await storage.putObject({
			key: thumbKey,
			body: processed.thumbBuffer,
			contentType: 'image/webp',
			cacheControl: IMMUTABLE_CACHE_CONTROL
		});
	} catch (error) {
		await rollbackObjects([key]);
		throw error;
	}

	try {
		await insertMediaObject({
			key,
			folder,
			sizeBytes: processed.fullSize,
			thumbSizeBytes: processed.thumbSize,
			contentType: 'image/webp',
			width: processed.width,
			height: processed.height
		});
	} catch (error) {
		await rollbackObjects([key, thumbKey]);
		throw error;
	}

	log('info', 'foto berhasil diunggah ke r2', {
		requestId,
		folder,
		key,
		originalSize: processed.originalSize,
		fullSize: processed.fullSize,
		thumbSize: processed.thumbSize,
		savedPercent: processed.savedPercent
	});

	return {
		key,
		url: getPublicMediaUrl(key),
		thumbUrl: getPublicThumbUrl(key),
		metrics: {
			originalSize: processed.originalSize,
			fullSize: processed.fullSize,
			thumbSize: processed.thumbSize,
			totalCompressedSize: processed.totalCompressedSize,
			savedPercent: processed.savedPercent,
			width: processed.width,
			height: processed.height
		}
	};
}
