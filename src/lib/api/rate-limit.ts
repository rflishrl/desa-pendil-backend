import { AppError } from "@/lib/api/errors";
import { getDb } from "@/lib/db/client";
import { log } from "@/lib/log";

export interface RateLimitRule {
  /** Rule identifier prefixed to rate limit keys (e.g. "login"). */
  name: string;
  limit: number;
  windowSeconds: number;
}

/** Extracts client IP, honoring proxy headers set by Vercel edge. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Records an attempt against `rule` + `identifier`, throwing RATE_LIMITED if exceeded.
 * Fails open if the rate-limit store is unreachable, logging a warning.
 */
export async function consumeRateLimit(
  rule: RateLimitRule,
  identifier: string,
  requestId?: string,
): Promise<void> {
  const key = `${rule.name}:${identifier}`;
  try {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, NOW() + (${rule.windowSeconds} || ' seconds')::interval)
      ON CONFLICT (key) DO UPDATE
      SET
        count = CASE
          WHEN rate_limits.reset_at <= NOW() THEN 1
          ELSE rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at <= NOW() THEN NOW() + (${rule.windowSeconds} || ' seconds')::interval
          ELSE rate_limits.reset_at
        END
      RETURNING count, GREATEST(1, EXTRACT(EPOCH FROM (reset_at - NOW()))::int) AS retry_after_seconds
    `;

    const row = rows[0] as { count: number; retry_after_seconds: number } | undefined;
    if (row && row.count > rule.limit) {
      const minutes = Math.max(1, Math.ceil(row.retry_after_seconds / 60));
      throw new AppError(
        "RATE_LIMITED",
        `Too many requests. Please try again in ${minutes} minute(s).`,
        { retryAfterSeconds: row.retry_after_seconds },
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    log("warn", "rate limit check skipped", { requestId, key, error });
  }
}

/** Resets attempt counter for `rule` + `identifier` upon successful authentication. */
export async function resetRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  try {
    const sql = getDb();
    await sql`DELETE FROM rate_limits WHERE key = ${`${rule.name}:${identifier}`}`;
  } catch (error) {
    log("warn", "rate limit reset failed", { error });
  }
}
