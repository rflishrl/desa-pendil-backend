import { after } from "next/server";

import { log } from "@/lib/log";

/** Revalidation settings read at runtime from environment variables. */
export function readRevalidateConfig(): {
  baseUrl: string | undefined;
  secret: string | undefined;
} {
  return {
    baseUrl: process.env.FRONTEND_URL?.trim().replace(/\/$/, "") || undefined,
    secret: process.env.REVALIDATE_SECRET?.trim() || undefined,
  };
}

export type RevalidateOutcome =
  | { state: "ok"; revalidated: string[] }
  | { state: "not_configured"; missing: string[] }
  | { state: "rejected"; status: number }
  | { state: "unreachable"; reason: string };

/**
 * Calls `POST {FRONTEND_URL}/api/revalidate` and returns the outcome.
 * Catches errors and returns them as values so callers can handle fallback.
 */
export async function sendRevalidate(
  tags: string[],
): Promise<RevalidateOutcome> {
  const { baseUrl, secret } = readRevalidateConfig();
  const missing = [
    ...(baseUrl ? [] : ["FRONTEND_URL"]),
    ...(secret ? [] : ["REVALIDATE_SECRET"]),
  ];
  if (!baseUrl || !secret) return { state: "not_configured", missing };

  try {
    const response = await fetch(`${baseUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return { state: "rejected", status: response.status };

    const body = (await response.json().catch(() => null)) as {
      revalidated?: unknown;
    } | null;
    const revalidated = Array.isArray(body?.revalidated)
      ? body.revalidated.filter((tag): tag is string => typeof tag === "string")
      : [];
    return { state: "ok", revalidated };
  } catch (error) {
    return {
      state: "unreachable",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Notifies frontend that data has changed, purging stale cache entries.
 * Runs via Next.js `after()` so mutations are not blocked by webhook latency.
 */
export function revalidateFrontend(tags: string[]) {
  const { baseUrl, secret } = readRevalidateConfig();
  if (!baseUrl || !secret) {
    // Missing configuration prevents immediate cache eviction
    log(
      "warn",
      "revalidate skipped: FRONTEND_URL or REVALIDATE_SECRET is missing",
      { tags, hasFrontendUrl: Boolean(baseUrl), hasSecret: Boolean(secret) },
    );
    return;
  }

  after(async () => {
    const outcome = await sendRevalidate(tags);
    switch (outcome.state) {
      case "ok":
        log("info", "revalidate dispatched", {
          tags,
          revalidated: outcome.revalidated,
        });
        break;
      case "rejected":
        log(
          "error",
          `revalidate rejected: frontend responded with HTTP ${outcome.status}`,
          {
            tags,
            status: outcome.status,
          },
        );
        break;
      case "unreachable":
        log("error", "revalidate failed: frontend unreachable", {
          tags,
          reason: outcome.reason,
        });
        break;
      case "not_configured":
        break;
    }
  });
}
