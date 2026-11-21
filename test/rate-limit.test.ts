import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '#lib/server/api/errors.js';
import { RATE_LIMITS } from '#lib/server/api/rate-limits.js';

const { mockSql, mockGetDb, mockLog } = vi.hoisted(() => {
	const mockSql = vi.fn();
	return {
		mockSql,
		mockGetDb: vi.fn(() => mockSql),
		mockLog: vi.fn()
	};
});

vi.mock('#lib/server/db/client.js', () => ({
	getDb: mockGetDb
}));

vi.mock('#lib/server/log.js', () => ({
	log: mockLog
}));

const { consumeRateLimit, resetRateLimit, purgeExpiredRateLimits } =
	await import('#lib/server/api/rate-limit.js');

beforeEach(() => {
	vi.clearAllMocks();
	mockGetDb.mockImplementation(() => mockSql);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('#lib/server/api/rate-limit (PostgreSQL fail-open)', () => {
	it('allows attempts up to rule.limit and uses rl:desa-pendil prefixed rules', async () => {
		mockSql.mockResolvedValueOnce([{ count: 5, retry_after_seconds: 900 }]);

		await expect(
			consumeRateLimit(RATE_LIMITS.login, '1.2.3.4:admin@desapendil.com', 'req-1')
		).resolves.toBeUndefined();
		expect(RATE_LIMITS.login).toEqual({
			name: 'rl:desa-pendil:login',
			limit: 5,
			windowSeconds: 900
		});
		expect(RATE_LIMITS.upload).toEqual({
			name: 'rl:desa-pendil:upload',
			limit: 20,
			windowSeconds: 60
		});
	});

	it('throws AppError(RATE_LIMITED) with retryAfterSeconds and Indonesian message when exceeded', async () => {
		mockSql.mockResolvedValueOnce([{ count: 6, retry_after_seconds: 125 }]);

		let caught: unknown;
		try {
			await consumeRateLimit(RATE_LIMITS.login, '1.2.3.4:admin@desapendil.com', 'req-2');
		} catch (err) {
			caught = err;
		}

		expect(caught).toBeInstanceOf(AppError);
		const appErr = caught as AppError;
		expect(appErr.status).toBe(429);
		expect(appErr.retryAfterSeconds).toBe(125);
		expect(appErr.message).toContain('Terlalu banyak percobaan');
	});

	it('fails open and logs a warning when database lookup fails', async () => {
		mockSql.mockRejectedValueOnce(new Error('Neon connection timeout'));

		await expect(consumeRateLimit(RATE_LIMITS.upload, 'admin-1', 'req-3')).resolves.toBeUndefined();
		expect(mockLog).toHaveBeenCalledWith(
			'warn',
			'rate limit check skipped',
			expect.objectContaining({
				requestId: 'req-3',
				key: 'rl:desa-pendil:upload:admin-1'
			})
		);
	});

	it('supports resetRateLimit and purgeExpiredRateLimits without throwing on DB error', async () => {
		mockSql.mockResolvedValueOnce([]);
		await expect(
			resetRateLimit(RATE_LIMITS.login, '1.2.3.4:admin@desapendil.com')
		).resolves.toBeUndefined();

		mockSql.mockResolvedValueOnce([{ key: 'k1' }, { key: 'k2' }]);
		await expect(purgeExpiredRateLimits()).resolves.toBe(2);

		mockSql.mockRejectedValueOnce(new Error('DB down'));
		await expect(purgeExpiredRateLimits()).resolves.toBe(0);
	});
});
