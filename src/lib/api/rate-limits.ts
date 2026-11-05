import type { RateLimitRule } from "@/lib/api/rate-limit";

/** Rate limiting rules keyed by operation category. */
export const RATE_LIMITS = {
  /** Public read operations without CDN caching. Frontend fetches on cache invalidation. */
  publicRead: { name: "public-read", limit: 120, windowSeconds: 60 },
  health: { name: "health", limit: 30, windowSeconds: 60 },
  login: { name: "login", limit: 8, windowSeconds: 10 * 60 },
} satisfies Record<string, RateLimitRule>;
