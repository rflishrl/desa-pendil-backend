import { describe, expect, it, vi } from 'vitest';

import { IMMUTABLE_CACHE_CONTROL } from '#lib/server/storage/media-url.js';
import { createR2Provider } from '#lib/server/storage/r2.js';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const CONFIG = {
	accessKeyId: 'test-access-key',
	secretAccessKey: 'test-secret-key',
	endpoint: 'https://acct123.r2.cloudflarestorage.com/',
	bucketName: 'desa-pendil'
};

describe('createR2Provider', () => {
	it('signs path-style PutObject with Content-Type and immutable Cache-Control', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(null, {
				status: 200,
				headers: { ETag: '"abc123"' }
			})
		);
		const provider = createR2Provider(CONFIG, fetchMock);
		const body = new Uint8Array([1, 2, 3, 4]);

		const result = await provider.putObject({
			key: `dev/${VALID_UUID}.webp`,
			body
		});

		expect(result).toEqual({
			key: `dev/${VALID_UUID}.webp`,
			etag: '"abc123"',
			sizeBytes: 4
		});

		const req = fetchMock.mock.calls[0]?.[0] as Request;
		expect(req.method).toBe('PUT');
		expect(req.url).toBe(
			`https://acct123.r2.cloudflarestorage.com/desa-pendil/dev/${VALID_UUID}.webp`
		);
		expect(req.headers.get('content-type')).toBe('image/webp');
		expect(req.headers.get('cache-control')).toBe(IMMUTABLE_CACHE_CONTROL);
		expect(req.headers.get('authorization')).toContain('AWS4-HMAC-SHA256');
	});

	it('handles HeadObject (200 and 404)', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(null, {
					status: 200,
					headers: {
						'Content-Length': '2048',
						'Content-Type': 'image/webp',
						ETag: '"e1"',
						'Last-Modified': 'Sat, 14 Nov 2026 12:00:00 GMT'
					}
				})
			)
			.mockResolvedValueOnce(new Response(null, { status: 404 }));

		const provider = createR2Provider(CONFIG, fetchMock);

		const hit = await provider.headObject(`${VALID_UUID}.webp`);
		expect(hit).toEqual({
			key: `${VALID_UUID}.webp`,
			contentLength: 2048,
			contentType: 'image/webp',
			etag: '"e1"',
			lastModified: new Date('Sat, 14 Nov 2026 12:00:00 GMT')
		});

		const missing = await provider.headObject(`${VALID_UUID}-thumb.webp`);
		expect(missing).toBeNull();
	});

	it('deletes full + thumb objects safely and records failures', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 204 }))
			.mockResolvedValueOnce(new Response(null, { status: 404 }))
			.mockRejectedValueOnce(new Error('network down'));

		const provider = createR2Provider(CONFIG, fetchMock);
		const key1 = `${VALID_UUID}.webp`;
		const key2 = `${VALID_UUID}-thumb.webp`;
		const key3 = `dev/${VALID_UUID}.webp`;

		const res = await provider.deleteObjects([key1, key2, key3]);
		expect(res.deleted).toEqual([key1, key2]);
		expect(res.failed).toEqual([{ key: key3, message: 'network down' }]);
	});

	it('parses S3 ListObjectsV2 XML responses', async () => {
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
  <Name>desa-pendil</Name>
  <IsTruncated>true</IsTruncated>
  <NextContinuationToken>tok-2</NextContinuationToken>
  <Contents>
    <Key>${VALID_UUID}.webp</Key>
    <Size>12345</Size>
    <LastModified>2026-11-14T10:00:00.000Z</LastModified>
  </Contents>
</ListBucketResult>`;
		const fetchMock = vi.fn().mockResolvedValue(new Response(xml, { status: 200 }));

		const provider = createR2Provider(CONFIG, fetchMock);
		const list = await provider.listObjects({ prefix: 'dev/', maxKeys: 50 });

		const req = fetchMock.mock.calls[0]?.[0] as Request;
		expect(req.url).toBe(
			'https://acct123.r2.cloudflarestorage.com/desa-pendil?list-type=2&prefix=dev%2F&max-keys=50'
		);
		expect(list).toEqual({
			items: [
				{
					key: `${VALID_UUID}.webp`,
					sizeBytes: 12345,
					lastModified: new Date('2026-11-14T10:00:00.000Z')
				}
			],
			isTruncated: true,
			nextContinuationToken: 'tok-2'
		});
	});

	it('rejects invalid object keys before sending network requests', async () => {
		const fetchMock = vi.fn();
		const provider = createR2Provider(CONFIG, fetchMock);

		await expect(
			provider.putObject({ key: '../secret.webp', body: new Uint8Array([1]) })
		).rejects.toMatchObject({ code: 'BAD_REQUEST' });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('normalizes endpoint URLs that already include a trailing bucket segment', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
		const provider = createR2Provider(
			{
				...CONFIG,
				endpoint: 'https://acct123.r2.cloudflarestorage.com/desa-pendil'
			},
			fetchMock
		);

		await provider.putObject({
			key: `dev/${VALID_UUID}.webp`,
			body: new Uint8Array([1, 2])
		});

		const req = fetchMock.mock.calls[0]?.[0] as Request;
		expect(req.url).toBe(
			`https://acct123.r2.cloudflarestorage.com/desa-pendil/dev/${VALID_UUID}.webp`
		);
	});
});
