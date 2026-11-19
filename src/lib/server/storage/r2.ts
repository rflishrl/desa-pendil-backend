import { AwsClient } from 'aws4fetch';

import { AppError } from '#lib/server/api/errors.js';
import { ConfigError, getServerEnv } from '#lib/server/env.js';
import { log } from '#lib/server/log.js';
import { assertValidObjectKey, IMMUTABLE_CACHE_CONTROL } from '#lib/server/storage/media-url.js';
import type {
	DeleteObjectsResult,
	HeadObjectResult,
	ListObjectsInput,
	ListObjectsResult,
	PutObjectInput,
	PutObjectResult,
	StorageObjectItem,
	StorageProvider
} from '#lib/server/storage/types.js';

export interface R2ClientConfig {
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
	bucketName: string;
}

type FetchFn = typeof fetch;

function buildBucketBaseUrl(endpoint: string, bucket: string): string {
	const cleanEndpoint = endpoint.replace(/\/+$/, '');
	const encodedBucket = encodeURIComponent(bucket);
	const trailingRaw = `/${bucket}`;
	const trailingEncoded = `/${encodedBucket}`;
	const baseEndpoint = cleanEndpoint.endsWith(trailingEncoded)
		? cleanEndpoint.slice(0, -trailingEncoded.length)
		: cleanEndpoint.endsWith(trailingRaw)
			? cleanEndpoint.slice(0, -trailingRaw.length)
			: cleanEndpoint;
	return `${baseEndpoint}/${encodedBucket}`;
}

function buildObjectUrl(endpoint: string, bucket: string, key: string): string {
	const encodedKey = key
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/');
	return `${buildBucketBaseUrl(endpoint, bucket)}/${encodedKey}`;
}

function byteLengthOf(body: PutObjectInput['body']): number {
	if (body instanceof Uint8Array) return body.byteLength;
	if (body instanceof ArrayBuffer) return body.byteLength;
	return body.size;
}

function toFetchBody(body: PutObjectInput['body']): Blob | ArrayBuffer | Uint8Array<ArrayBuffer> {
	if (body instanceof Blob || body instanceof ArrayBuffer) {
		return body;
	}
	if (
		body.buffer instanceof ArrayBuffer &&
		body.byteOffset === 0 &&
		body.byteLength === body.buffer.byteLength
	) {
		return body.buffer;
	}
	const copy = new Uint8Array(body.byteLength);
	copy.set(body);
	return copy;
}

function decodeXmlEntities(value: string): string {
	return value
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&apos;', "'")
		.replaceAll('&amp;', '&');
}

function readXmlTag(source: string, tag: string): string | null {
	const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(source);
	return match?.[1] !== undefined ? decodeXmlEntities(match[1].trim()) : null;
}

function parseListObjectsXml(xml: string): ListObjectsResult {
	const items: StorageObjectItem[] = [];
	for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
		const block = match[1];
		if (!block) continue;
		const key = readXmlTag(block, 'Key');
		if (!key) continue;
		const sizeRaw = readXmlTag(block, 'Size');
		const lastModifiedRaw = readXmlTag(block, 'LastModified');
		const sizeBytes = sizeRaw ? Number(sizeRaw) : 0;
		const parsedDate = lastModifiedRaw ? new Date(lastModifiedRaw) : null;

		items.push({
			key,
			sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
			lastModified: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null
		});
	}

	return {
		items,
		isTruncated: readXmlTag(xml, 'IsTruncated') === 'true',
		nextContinuationToken: readXmlTag(xml, 'NextContinuationToken')
	};
}

function resolveR2Config(): R2ClientConfig {
	const env = getServerEnv();
	if (
		!env.R2_ACCESS_KEY_ID ||
		!env.R2_SECRET_ACCESS_KEY ||
		!env.R2_ENDPOINT ||
		!env.R2_BUCKET_NAME
	) {
		throw new ConfigError(
			'Konfigurasi R2 tidak lengkap (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME wajib diisi).'
		);
	}
	return {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		endpoint: env.R2_ENDPOINT,
		bucketName: env.R2_BUCKET_NAME
	};
}

/** Creates an S3-compatible Cloudflare R2 provider powered by `aws4fetch` (path-style). */
export function createR2Provider(
	config: R2ClientConfig,
	fetchFn: FetchFn = fetch
): StorageProvider {
	const client = new AwsClient({
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
		service: 's3',
		region: 'auto'
	});

	async function signedFetch(url: string, init: RequestInit): Promise<Response> {
		const signedRequest = await client.sign(url, init);
		return fetchFn(signedRequest);
	}

	return {
		name: 'r2',

		async putObject(input: PutObjectInput): Promise<PutObjectResult> {
			const key = assertValidObjectKey(input.key);
			const url = buildObjectUrl(config.endpoint, config.bucketName, key);
			const contentType = input.contentType ?? 'image/webp';
			const cacheControl = input.cacheControl ?? IMMUTABLE_CACHE_CONTROL;

			let response: Response;
			try {
				response = await signedFetch(url, {
					method: 'PUT',
					headers: {
						'Content-Type': contentType,
						'Cache-Control': cacheControl
					},
					body: toFetchBody(input.body)
				});
			} catch (error) {
				log('error', 'gagal mengunggah objek ke R2', { key, error });
				throw new AppError('UNAVAILABLE', 'Gagal mengunggah gambar ke penyimpanan R2.', {
					cause: error
				});
			}

			if (!response.ok) {
				log('error', 'R2 menolak unggahan objek', {
					key,
					status: response.status
				});
				throw new AppError(
					'UNAVAILABLE',
					`Penyimpanan R2 mengembalikan status ${response.status}.`
				);
			}

			return {
				key,
				etag: response.headers.get('ETag'),
				sizeBytes: byteLengthOf(input.body)
			};
		},

		async deleteObjects(keys: string[]): Promise<DeleteObjectsResult> {
			const deleted: string[] = [];
			const failed: Array<{ key: string; message: string }> = [];

			for (const rawKey of keys) {
				const key = assertValidObjectKey(rawKey);
				const url = buildObjectUrl(config.endpoint, config.bucketName, key);
				try {
					const response = await signedFetch(url, { method: 'DELETE' });
					if (response.ok || response.status === 204 || response.status === 404) {
						deleted.push(key);
					} else {
						const message = `HTTP ${response.status}`;
						failed.push({ key, message });
						log('error', 'gagal menghapus objek di R2', {
							key,
							status: response.status
						});
					}
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					failed.push({ key, message });
					log('error', 'gagal menghapus objek di R2', { key, error });
				}
			}

			return { deleted, failed };
		},

		async headObject(rawKey: string): Promise<HeadObjectResult | null> {
			const key = assertValidObjectKey(rawKey);
			const url = buildObjectUrl(config.endpoint, config.bucketName, key);

			let response: Response;
			try {
				response = await signedFetch(url, { method: 'HEAD' });
			} catch (error) {
				log('error', 'gagal memeriksa metadata objek di R2', { key, error });
				throw new AppError('UNAVAILABLE', 'Gagal menghubungi penyimpanan R2.', {
					cause: error
				});
			}

			if (response.status === 404) return null;
			if (!response.ok) {
				throw new AppError(
					'UNAVAILABLE',
					`Penyimpanan R2 mengembalikan status ${response.status}.`
				);
			}

			const contentLengthRaw = response.headers.get('Content-Length');
			const contentLength = contentLengthRaw ? Number(contentLengthRaw) : 0;
			const lastModifiedRaw = response.headers.get('Last-Modified');
			const lastModified = lastModifiedRaw ? new Date(lastModifiedRaw) : null;

			return {
				key,
				contentLength: Number.isFinite(contentLength) ? contentLength : 0,
				contentType: response.headers.get('Content-Type'),
				etag: response.headers.get('ETag'),
				lastModified: lastModified && !Number.isNaN(lastModified.getTime()) ? lastModified : null
			};
		},

		async listObjects(input: ListObjectsInput = {}): Promise<ListObjectsResult> {
			const url = new URL(buildBucketBaseUrl(config.endpoint, config.bucketName));
			url.searchParams.set('list-type', '2');
			if (input.prefix) url.searchParams.set('prefix', input.prefix);
			if (input.continuationToken) {
				url.searchParams.set('continuation-token', input.continuationToken);
			}
			if (input.maxKeys !== undefined) {
				url.searchParams.set('max-keys', String(input.maxKeys));
			}

			let response: Response;
			try {
				response = await signedFetch(url.toString(), { method: 'GET' });
			} catch (error) {
				log('error', 'gagal membaca daftar objek R2', { error });
				throw new AppError('UNAVAILABLE', 'Gagal membaca daftar objek dari penyimpanan R2.', {
					cause: error
				});
			}

			if (!response.ok) {
				log('error', 'R2 menolak ListObjectsV2', { status: response.status });
				throw new AppError(
					'UNAVAILABLE',
					`Penyimpanan R2 mengembalikan status ${response.status}.`
				);
			}

			const xml = await response.text();
			return parseListObjectsXml(xml);
		}
	};
}

/** Instantiates the configured R2 storage provider from validated server env. */
export function getR2Provider(): StorageProvider {
	return createR2Provider(resolveR2Config());
}
