import "server-only";

import { AppError } from "@/lib/api/errors";
import { log } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitRule {
  /** Nama aturan, jadi awalan kunci (mis. "login"). */
  name: string;
  limit: number;
  windowSeconds: number;
}

/** Alamat IP klien. Di Vercel, `x-real-ip` dan `x-forwarded-for` diisi oleh Vercel. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Menghitung satu percobaan untuk `rule` + `identifier`. Melempar RATE_LIMITED jika
 * batas terlampaui. Jika database penghitung tidak bisa dihubungi, request tetap
 * dilayani (fail open) dan kejadiannya dicatat; Supabase Auth punya batas sendiri.
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
    log("warn", "rate limit tidak bisa diperiksa", { requestId, key, error });
    return;
  }
  if (!data.allowed) {
    const minutes = Math.max(1, Math.ceil(data.retry_after_seconds / 60));
    throw new AppError(
      "RATE_LIMITED",
      `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`,
      { retryAfterSeconds: data.retry_after_seconds },
    );
  }
}

/** Menghapus penghitung (mis. setelah login berhasil). */
export async function resetRateLimit(
  rule: RateLimitRule,
  identifier: string,
): Promise<void> {
  const { error } = await createAdminClient().rpc("rate_limit_reset", {
    p_key: `${rule.name}:${identifier}`,
  });
  if (error) log("warn", "rate limit gagal direset", { error });
}
