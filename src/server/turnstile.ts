import { getTurnstileAllowedHostnames, getTurnstileSecretKey } from "@/lib/env";
import { log } from "@/lib/log";

export interface VerifyTurnstileOptions {
  token: string;
  expectedAction?: string;
  clientIp?: string;
}

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
}

interface CloudflareSiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

const CLOUDFLARE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;

// In-memory set with 5-minute TTL to defend against immediate token reuse (single-use token enforcement).
const seenTokens = new Map<string, number>();
const TOKEN_TTL_MS = 5 * 60 * 1000;

function purgeExpiredTokens(now: number) {
  for (const [t, expiry] of seenTokens.entries()) {
    if (now > expiry) seenTokens.delete(t);
  }
}

function isHostnamePermitted(hostname: string | undefined, allowedHostnames: string[]): boolean {
  if (!hostname) return false;
  const target = hostname.toLowerCase();

  return allowedHostnames.some((allowed) => {
    const pattern = allowed.toLowerCase().trim();
    if (!pattern) return false;
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(2);
      return target.endsWith(suffix) || target === suffix;
    }
    return target === pattern;
  });
}

/**
 * Server-side verification for Cloudflare Turnstile tokens.
 * Enforces fail-closed semantics: network errors, timeouts, empty tokens,
 * action mismatches, or unlisted hostnames result in rejection.
 */
export async function verifyTurnstile({
  token,
  expectedAction,
  clientIp,
}: VerifyTurnstileOptions): Promise<TurnstileVerificationResult> {
  const trimmedToken = token?.trim();
  if (!trimmedToken) {
    return { success: false, error: "Verifikasi gagal." };
  }

  const now = Date.now();
  purgeExpiredTokens(now);

  if (seenTokens.has(trimmedToken)) {
    log("warn", "turnstile token replay detected", { tokenPrefix: trimmedToken.slice(0, 10) });
    return { success: false, error: "Verifikasi gagal." };
  }

  let secretKey: string;
  try {
    secretKey = getTurnstileSecretKey();
  } catch (error) {
    log("error", "turnstile secret key is missing", { error });
    return { success: false, error: "Verifikasi gagal." };
  }

  const allowedHostnames = getTurnstileAllowedHostnames();
  if (process.env.NODE_ENV === "production" && allowedHostnames.length === 0) {
    log("error", "TURNSTILE_ALLOWED_HOSTNAMES is unconfigured in production");
    return { success: false, error: "Verifikasi gagal." };
  }

  // Register token to prevent replay
  seenTokens.set(trimmedToken, now + TOKEN_TTL_MS);

  try {
    const body = new URLSearchParams();
    body.append("secret", secretKey);
    body.append("response", trimmedToken);
    if (clientIp && clientIp !== "unknown") {
      body.append("remoteip", clientIp);
    }

    const response = await fetch(CLOUDFLARE_SITEVERIFY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      log("error", "turnstile siteverify returned non-200 HTTP status", {
        status: response.status,
      });
      return { success: false, error: "Verifikasi gagal." };
    }

    const data = (await response.json()) as CloudflareSiteverifyResponse;

    if (!data.success) {
      log("warn", "turnstile siteverify rejected token", {
        errorCodes: data["error-codes"],
        action: data.action,
        hostname: data.hostname,
      });
      return { success: false, error: "Verifikasi gagal." };
    }

    if (expectedAction && data.action && data.action !== expectedAction) {
      log("warn", "turnstile action mismatch", {
        expected: expectedAction,
        received: data.action,
      });
      return { success: false, error: "Verifikasi gagal." };
    }

    if (data.hostname && allowedHostnames.length > 0) {
      const allowed = isHostnamePermitted(data.hostname, allowedHostnames);
      if (!allowed) {
        log("warn", "turnstile hostname not in allowed list", {
          hostname: data.hostname,
          allowedList: allowedHostnames,
        });
        return { success: false, error: "Verifikasi gagal." };
      }
    }

    return { success: true };
  } catch (error) {
    log("error", "turnstile verification request exception or timeout", { error });
    return { success: false, error: "Verifikasi gagal." };
  }
}

/** Clear seen tokens cache (used in testing). */
export function _resetSeenTokensForTesting(): void {
  seenTokens.clear();
}
