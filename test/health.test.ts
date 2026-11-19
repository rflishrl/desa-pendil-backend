import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readBody, sameOriginRequest } from './api.js';

const pingDatabase = vi.fn();

vi.mock('#lib/server/features/health/repository.js', () => ({
	pingDatabase: (...args: unknown[]) => pingDatabase(...args)
}));
vi.mock('#lib/server/api/rate-limit.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/server/api/rate-limit.js')>()),
	consumeRateLimit: async () => undefined
}));

const { GET } = await import('../src/routes/api/health/+server.js');
const { checkHealth } = await import('#lib/server/features/health/service.js');

beforeEach(() => {
	pingDatabase.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('checkHealth (service)', () => {
	it('returns ok when database responds', async () => {
		pingDatabase.mockResolvedValue(undefined);
		await expect(checkHealth()).resolves.toEqual({
			status: 'ok',
			database: 'ok'
		});
	});

	it('throws UNAVAILABLE if database fails', async () => {
		pingDatabase.mockRejectedValue(new Error('timeout'));
		await expect(checkHealth()).rejects.toMatchObject({
			code: 'UNAVAILABLE'
		});
	});
});

describe('GET /api/health', () => {
	it('returns 200 when database responds', async () => {
		pingDatabase.mockResolvedValue(undefined);
		const response = await GET(sameOriginRequest('/api/health'));
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(await readBody(response)).toEqual({
			success: true,
			data: { status: 'ok', database: 'ok' }
		});
	});

	it('returns 503 if database check fails', async () => {
		pingDatabase.mockRejectedValue(new Error('password authentication failed'));
		const response = await GET(sameOriginRequest('/api/health'));
		expect(response.status).toBe(503);
		const body = await readBody(response);
		expect(body).toEqual({
			success: false,
			error: 'Database tidak dapat dijangkau.'
		});
	});
});
