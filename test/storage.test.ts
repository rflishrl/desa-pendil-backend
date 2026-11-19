import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetServerEnvCache } from '#lib/server/env.js';
import { readBody, sameOriginRequest } from './api.js';

const getCurrentAdmin = vi.fn();
const getMediaUsageSummary = vi.fn();
const listMediaObjectEntries = vi.fn();
const listMediaObjectsPage = vi.fn();
const listReferencedImageUrls = vi.fn();

vi.mock('#lib/server/auth/session.js', () => ({
	getCurrentAdmin: (...args: unknown[]) => getCurrentAdmin(...args)
}));
vi.mock('#lib/server/features/uploads/repository.js', async () => {
	const actual = await vi.importActual<typeof import('#lib/server/features/uploads/repository.js')>(
		'#lib/server/features/uploads/repository.js'
	);
	return {
		...actual,
		getMediaUsageSummary: (...args: unknown[]) => getMediaUsageSummary(...args),
		listMediaObjectEntries: (...args: unknown[]) => listMediaObjectEntries(...args),
		listMediaObjectsPage: (...args: unknown[]) => listMediaObjectsPage(...args),
		listReferencedImageUrls: (...args: unknown[]) => listReferencedImageUrls(...args)
	};
});

const { GET } = await import('../src/routes/api/admin/storage/+server.js');

const ADMIN = {
	id: 'a1',
	email: 'admin@desapendil.id',
	role: 'admin' as const
};

const UUID_1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID_2 = '550e8400-e29b-41d4-a716-446655440002';
const UUID_3 = '550e8400-e29b-41d4-a716-446655440003';

function stubEnvForStorage(quotaMb = '100') {
	vi.stubEnv('R2_ACCESS_KEY_ID', 'super-secret-access-key-id');
	vi.stubEnv('R2_SECRET_ACCESS_KEY', 'super-secret-r2-token');
	vi.stubEnv('R2_ENDPOINT', 'https://secret-account.r2.cloudflarestorage.com');
	vi.stubEnv('R2_BUCKET_NAME', 'desa-pendil');
	vi.stubEnv('R2_PUBLIC_DOMAIN', 'https://media-dp.raflisahrul.my.id');
	vi.stubEnv('R2_APP_QUOTA_MB', quotaMb);
	resetServerEnvCache();
}

beforeEach(() => {
	vi.clearAllMocks();
	resetServerEnvCache();
	getCurrentAdmin.mockResolvedValue(ADMIN);
});

afterEach(() => {
	vi.unstubAllEnvs();
	resetServerEnvCache();
});

describe('GET /api/admin/storage', () => {
	it('menolak akses tanpa sesi admin (401)', async () => {
		getCurrentAdmin.mockResolvedValue(null);
		const response = await GET(sameOriginRequest('/api/admin/storage'));
		expect(response.status).toBe(401);
	});

	it('menangani state nol data secara bersih tanpa membocorkan secret', async () => {
		stubEnvForStorage('2560');
		getMediaUsageSummary.mockResolvedValue({
			totalBytes: 0,
			totalThumbBytes: 0,
			totalCount: 0
		});
		listMediaObjectEntries.mockResolvedValue([]);
		listMediaObjectsPage.mockResolvedValue([]);
		listReferencedImageUrls.mockResolvedValue(new Set());

		const response = await GET(sameOriginRequest('/api/admin/storage'));
		expect(response.status).toBe(200);
		const rawText = await response.clone().text();
		expect(rawText).not.toContain('super-secret-access-key-id');
		expect(rawText).not.toContain('super-secret-r2-token');
		expect(rawText).not.toContain('secret-account.r2.cloudflarestorage.com');

		const body = await readBody<{
			usage: {
				usedBytes: number;
				usedPercent: number;
				status: string;
				totalCount: number;
			};
			config: { provider: string; bucketName: string; keyPrefix: string };
			items: unknown[];
			pagination: { page: number; total: number; totalPages: number };
		}>(response);

		if (!body.success) throw new Error('Expected success response');
		expect(body.data.usage).toMatchObject({
			usedBytes: 0,
			usedPercent: 0,
			status: 'normal',
			totalCount: 0
		});
		expect(body.data.config).toMatchObject({
			provider: 'r2',
			bucketName: 'desa-pendil',
			keyPrefix: 'dev/'
		});
		expect(body.data.items).toEqual([]);
		expect(body.data.pagination).toEqual({
			total: 0,
			page: 1,
			limit: 10,
			totalPages: 0
		});
	});

	it('menghitung agregat kuota, status waspada/kritis, komposisi active vs orphan, dan paginasi aset', async () => {
		stubEnvForStorage('10');
		const now = Date.now();
		const recentIso = new Date(now - 2 * 60 * 60 * 1000).toISOString();
		const oldIso = new Date(now - 48 * 60 * 60 * 1000).toISOString();

		const fullBytes = 7 * 1024 * 1024;
		const thumbBytes = 512 * 1024;
		getMediaUsageSummary.mockResolvedValue({
			totalBytes: fullBytes,
			totalThumbBytes: thumbBytes,
			totalCount: 3
		});
		listMediaObjectEntries.mockResolvedValue([
			{ key: `dev/${UUID_1}.webp`, createdAt: oldIso },
			{ key: `dev/${UUID_2}.webp`, createdAt: recentIso },
			{ key: `dev/${UUID_3}.webp`, createdAt: oldIso }
		]);
		listMediaObjectsPage.mockResolvedValue([
			{
				key: `dev/${UUID_2}.webp`,
				folder: 'articles',
				sizeBytes: 3_000_000,
				thumbSizeBytes: 200_000,
				contentType: 'image/webp',
				width: 1200,
				height: 900,
				createdAt: recentIso
			}
		]);
		listReferencedImageUrls.mockResolvedValue(
			new Set([`https://media-dp.raflisahrul.my.id/dev/${UUID_1}.webp`])
		);

		const response = await GET(sameOriginRequest('/api/admin/storage?page=2&limit=1'));
		expect(response.status).toBe(200);
		expect(listMediaObjectsPage).toHaveBeenCalledWith({ limit: 1, offset: 1 });

		const body = await readBody<{
			usage: {
				usedBytes: number;
				fullBytes: number;
				thumbBytes: number;
				usedPercent: number;
				status: string;
				activeCount: number;
				orphanCount: number;
				gracePeriodOrphanCount: number;
				eligibleCleanupCount: number;
			};
			items: Array<{
				key: string;
				thumbUrl: string;
				isReferenced: boolean;
				isEligibleForCleanup: boolean;
			}>;
			pagination: {
				total: number;
				page: number;
				limit: number;
				totalPages: number;
			};
		}>(response);

		if (!body.success) throw new Error('Expected success response');
		expect(body.data.usage).toMatchObject({
			usedBytes: fullBytes + thumbBytes,
			fullBytes,
			thumbBytes,
			usedPercent: 75,
			status: 'warning',
			activeCount: 1,
			orphanCount: 2,
			gracePeriodOrphanCount: 1,
			eligibleCleanupCount: 1
		});
		expect(body.data.items[0]).toMatchObject({
			key: `dev/${UUID_2}.webp`,
			thumbUrl: `https://media-dp.raflisahrul.my.id/dev/${UUID_2}-thumb.webp`,
			isReferenced: false,
			isEligibleForCleanup: false
		});
		expect(body.data.pagination).toEqual({
			total: 3,
			page: 2,
			limit: 1,
			totalPages: 3
		});

		getMediaUsageSummary.mockResolvedValue({
			totalBytes: 9 * 1024 * 1024,
			totalThumbBytes: 512 * 1024,
			totalCount: 3
		});
		const criticalRes = await GET(sameOriginRequest('/api/admin/storage'));
		const criticalBody = await readBody<{ usage: { status: string } }>(criticalRes);
		if (!criticalBody.success) throw new Error('Expected success response');
		expect(criticalBody.data.usage.status).toBe('critical');
	});
});
