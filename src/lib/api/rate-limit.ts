import "server-only";

import { AppError } from "@/lib/api/errors";
import { log } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const { data, error } = await createAdminClient()
    .rpc("rate_limit_hit", {
      p_key: key,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    })
    .single();

  if (error || !data) {
    log("warn", "rate limit check skipped", { requestId, key, error });
    return;
  }
  if (!data.allowed) {
    const minutes = Math.max(1, Math.ceil(data.retry_after_seconds / 60));
    throw new AppError(
      "RATE_LIMITED",
      `Too many requests. Please try again in ${minutes} minute(s).`,
      { retryAfterSeconds: data.retry_after_seconds },
    );
  }
}

/** Resets attempt counter for `rule` + `identifier` upon successful authentication. */
export async function resetRateLimit(
  rule: RateLimitRule,
  identifier: string,
): Promise<void> {
  const { error } = await createAdminClient().rpc("rate_limit_reset", {
    p_key: `${rule.name}:${identifier}`,
  });
  if (error) log("warn", "rate limit reset failed", { error });
}
