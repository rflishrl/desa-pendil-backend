import { afterEach, describe, expect, it, vi } from 'vitest';

import { consumeRateLimit } from '#lib/server/api/rate-limit.js';
import { RATE_LIMITS } from '#lib/server/api/rate-limits.js';
import { resetServerEnvCache } from '#lib/server/env.js';

describe('consumeRateLimit (unmocked @neondatabase/serverless fail-open)', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
		resetServerEnvCache();
	});

	it('fails open when real Neon PostgreSQL endpoint is unreachable', async () => {
		vi.stubEnv('DATABASE_URI', 'postgresql://user:pass@127.0.0.1:59999/unreachable');
		vi.stubEnv('R2_ACCESS_KEY_ID', 'key');
		vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret');
		vi.stubEnv('R2_ENDPOINT', 'https://acc.r2.cloudflarestorage.com');
		vi.stubEnv('R2_BUCKET_NAME', 'desa-pendil');
		vi.stubEnv('R2_PUBLIC_DOMAIN', 'https://media-dp.raflisahrul.my.id');
		resetServerEnvCache();

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		await expect(
			consumeRateLimit(RATE_LIMITS.login, '203.0.113.99:failopen@example.invalid', 'req-failopen')
		).resolves.toBeUndefined();

		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(String(warnSpy.mock.calls[0]?.[0] ?? '')).toContain('rate limit check skipped');
	});
});
