import { RATE_LIMITS } from '#lib/server/api/rate-limits.js';
import { withApi } from '#lib/server/api/with-api.js';
import { checkHealth } from '#lib/server/features/health/service.js';

export const GET = withApi({ access: 'public', rateLimit: RATE_LIMITS.health }, async () => ({
	data: await checkHealth()
}));
