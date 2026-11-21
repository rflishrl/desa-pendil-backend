import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '#lib/server/api/errors.js';
import { resetServerEnvCache } from '#lib/server/env.js';
import { readBody, sameOriginRequest } from './api.js';

const TINY_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
	'base64'
);

const getCurrentAdmin = vi.fn();
const putObject = vi.fn();
const deleteObjects = vi.fn();
const insertMediaObject = vi.fn();
const getMediaUsageSummary = vi.fn();
const consumeRateLimit = vi.fn();

vi.mock('#lib/server/api/rate-limit.js', async () => {
	const actual = await vi.importActual<typeof import('#lib/server/api/rate-limit.js')>(
		'#lib/server/api/rate-limit.js'
	);
	return {
		...actual,
		consumeRateLimit: (...args: unknown[]) => consumeRateLimit(...args)
	};
});
vi.mock('#lib/server/auth/session.js', () => ({
	getCurrentAdmin: (...args: unknown[]) => getCurrentAdmin(...args)
}));
vi.mock('#lib/server/storage/provider.js', async () => {
	const actual = await vi.importActual<typeof import('#lib/server/storage/provider.js')>(
		'#lib/server/storage/provider.js'
	);
	return {
		...actual,
		getR2Storage: () => ({
			name: 'r2' as const,
			putObject: (...args: unknown[]) => putObject(...args),
			deleteObjects: (...args: unknown[]) => deleteObjects(...args),
			headObject: vi.fn(),
			listObjects: vi.fn()
		})
	};
});
vi.mock('#lib/server/features/uploads/repository.js', async () => {
	const actual = await vi.importActual<typeof import('#lib/server/features/uploads/repository.js')>(
		'#lib/server/features/uploads/repository.js'
	);
	return {
		...actual,
		insertMediaObject: (...args: unknown[]) => insertMediaObject(...args),
		getMediaUsageSummary: (...args: unknown[]) => getMediaUsageSummary(...args)
	};
});

const { POST } = await import('../src/routes/api/upload/+server.js');

const ADMIN = {
	id: 'a1',
	email: 'admin@desapendil.id',
	role: 'admin' as const
};

function makeUploadRequest(folder: string, file: File | null, origin = 'http://localhost:4000') {
	const form = new FormData();
	form.set('folder', folder);
	if (file) form.set('file', file);
	return new Request('http://localhost:4000/api/upload', {
		method: 'POST',
		headers: { origin, host: 'localhost:4000' },
		body: form
	});
}

function stubR2Env() {
	vi.stubEnv('R2_ACCESS_KEY_ID', 'key');
	vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret');
	vi.stubEnv('R2_ENDPOINT', 'https://acc.r2.cloudflarestorage.com');
	vi.stubEnv('R2_BUCKET_NAME', 'desa-pendil');
	vi.stubEnv('R2_PUBLIC_DOMAIN', 'https://media-dp.raflisahrul.my.id');
	vi.stubEnv('R2_APP_QUOTA_MB', '2560');
	vi.stubEnv('MAX_UPLOAD_MB', '4');
	resetServerEnvCache();
}

beforeEach(() => {
	vi.clearAllMocks();
	resetServerEnvCache();
	getCurrentAdmin.mockResolvedValue(ADMIN);
	getMediaUsageSummary.mockResolvedValue({
		totalBytes: 0,
		totalThumbBytes: 0,
		totalCount: 0
	});
	putObject.mockResolvedValue({ key: 'dev/x.webp', etag: '1', sizeBytes: 44 });
	deleteObjects.mockResolvedValue({ deleted: [], failed: [] });
	insertMediaObject.mockResolvedValue({ key: 'dev/x.webp' });
	consumeRateLimit.mockResolvedValue(undefined);
	vi.spyOn(console, 'info').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllEnvs();
	resetServerEnvCache();
});

describe('POST /api/upload', () => {
	it('menolak request tanpa sesi admin (401) dan cross-origin (403) sebelum rate limiter', async () => {
		getCurrentAdmin.mockResolvedValue(null);
		const file = new File([TINY_PNG], 'foto.png', { type: 'image/png' });
		const unauth = await POST(makeUploadRequest('articles', file));
		expect(unauth.status).toBe(401);
		expect(consumeRateLimit).not.toHaveBeenCalled();

		const csrf = await POST(makeUploadRequest('articles', file, 'https://evil.example'));
		expect(csrf.status).toBe(403);
		expect(consumeRateLimit).not.toHaveBeenCalled();
	});

	it('mengunggah pasangan WebP full + thumb ke R2, mencatat DB, dan mengembalikan metrics', async () => {
		stubR2Env();
		const file = new File([TINY_PNG], 'berita.png', { type: 'image/png' });
		const response = await POST(makeUploadRequest('articles', file));

		expect(response.status).toBe(201);
		const body = await readBody<{
			key: string;
			url: string;
			thumbUrl: string;
			metrics: { fullSize: number; thumbSize: number };
		}>(response);

		if (!body.success) throw new Error('Expected success response');
		expect(body.data.key).toMatch(/^dev\/[0-9a-f-]+\.webp$/);
		expect(body.data.url).toBe(`https://media-dp.raflisahrul.my.id/${body.data.key}`);
		expect(body.data.thumbUrl).toBe(
			`https://media-dp.raflisahrul.my.id/${body.data.key.replace('.webp', '-thumb.webp')}`
		);

		expect(putObject).toHaveBeenCalledTimes(2);
		expect(putObject).toHaveBeenNthCalledWith(1, {
			key: body.data.key,
			body: expect.any(Uint8Array),
			contentType: 'image/webp',
			cacheControl: 'public, max-age=31536000, immutable'
		});
		expect(putObject).toHaveBeenNthCalledWith(2, {
			key: body.data.key.replace('.webp', '-thumb.webp'),
			body: expect.any(Uint8Array),
			contentType: 'image/webp',
			cacheControl: 'public, max-age=31536000, immutable'
		});
		expect(insertMediaObject).toHaveBeenCalledWith(
			expect.objectContaining({
				key: body.data.key,
				folder: 'articles',
				contentType: 'image/webp'
			})
		);
	});

	it('menolak upload bila file kosong, > MAX_UPLOAD_MB, atau kuota R2 penuh', async () => {
		stubR2Env();
		const empty = new File([], 'empty.png', { type: 'image/png' });
		expect((await POST(makeUploadRequest('articles', empty))).status).toBe(400);

		const tooBig = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'big.png', {
			type: 'image/png'
		});
		expect((await POST(makeUploadRequest('articles', tooBig))).status).toBe(413);

		vi.stubEnv('R2_APP_QUOTA_MB', '1');
		resetServerEnvCache();
		getMediaUsageSummary.mockResolvedValue({
			totalBytes: 1024 * 1024,
			totalThumbBytes: 0,
			totalCount: 5
		});
		const valid = new File([TINY_PNG], 'ok.png', { type: 'image/png' });
		const quotaResp = await POST(makeUploadRequest('articles', valid));
		expect(quotaResp.status).toBe(413);
		expect(putObject).not.toHaveBeenCalled();
	});

	it('melakukan rollback full jika PUT thumb gagal, dan rollback full + thumb jika insert DB gagal', async () => {
		stubR2Env();
		const file = new File([TINY_PNG], 'fail.png', { type: 'image/png' });

		putObject
			.mockResolvedValueOnce({ key: 'dev/full.webp', etag: '1', sizeBytes: 44 })
			.mockRejectedValueOnce(new Error('R2 thumb error'));
		const thumbFail = await POST(makeUploadRequest('articles', file));
		expect(thumbFail.status).toBe(500);
		expect(deleteObjects).toHaveBeenCalledTimes(1);
		expect(deleteObjects).toHaveBeenCalledWith([expect.stringMatching(/^dev\/[0-9a-f-]+\.webp$/)]);
		expect(insertMediaObject).not.toHaveBeenCalled();

		vi.clearAllMocks();
		getCurrentAdmin.mockResolvedValue(ADMIN);
		getMediaUsageSummary.mockResolvedValue({
			totalBytes: 0,
			totalThumbBytes: 0,
			totalCount: 0
		});
		putObject.mockResolvedValue({ key: 'dev/x.webp', etag: '1', sizeBytes: 44 });
		deleteObjects.mockResolvedValue({ deleted: [], failed: [] });
		insertMediaObject.mockRejectedValue(new Error('DB failed'));
		const dbFail = await POST(makeUploadRequest('articles', file));
		expect(dbFail.status).toBe(500);
		expect(deleteObjects).toHaveBeenCalledTimes(1);
		expect(deleteObjects).toHaveBeenCalledWith([
			expect.stringMatching(/^dev\/[0-9a-f-]+\.webp$/),
			expect.stringMatching(/^dev\/[0-9a-f-]+-thumb\.webp$/)
		]);
	});

	it('menolak body bukan multipart', async () => {
		const bad = await POST(sameOriginRequest('/api/upload', { method: 'POST', json: { x: 1 } }));
		expect(bad.status).toBe(400);
	});

	it('menerapkan rate limit upload dan mengembalikan 429 saat kuota jendela habis', async () => {
		consumeRateLimit.mockRejectedValueOnce(
			new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi nanti.')
		);

		const file = new File([TINY_PNG], 'tiny.png', { type: 'image/png' });
		const res = await POST(makeUploadRequest('articles', file));
		expect(res.status).toBe(429);
		expect(consumeRateLimit).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'rl:desa-pendil:upload',
				limit: 20,
				windowSeconds: 60
			}),
			ADMIN.id,
			expect.any(String)
		);
		expect(putObject).not.toHaveBeenCalled();
	});
});
