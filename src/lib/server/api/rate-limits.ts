import type { RateLimitRule } from '#lib/server/api/rate-limit.js';

/** Rate limiting rules keyed by operation category. */
export const RATE_LIMITS = {
	publicRead: { name: 'public-read', limit: 120, windowSeconds: 60 },
	health: { name: 'health', limit: 30, windowSeconds: 60 },
	login: { name: 'login', limit: 8, windowSeconds: 10 * 60 },
	upload: { name: 'upload', limit: 30, windowSeconds: 10 * 60 }
} satisfies Record<string, RateLimitRule>;
