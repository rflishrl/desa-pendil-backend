/**
 * Tiny in-memory fixed-window limiter for login attempts.
 * Note: on serverless each instance has its own memory, so this slows brute force
 * but is not a global guarantee. Put Vercel Firewall rate limiting in front for that.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string): void {
  hits.delete(key);
}
