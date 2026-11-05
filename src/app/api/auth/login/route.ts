import { login } from "@/features/auth/service";
import { getClientIp, resetRateLimit } from "@/lib/api/rate-limit";
import { RATE_LIMITS } from "@/lib/api/rate-limits";
import { readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 10;

/** Login admin. Dibatasi 8 percobaan per 10 menit per IP; berhasil = penghitung direset. */
export const POST = withApi(
  { access: "session", rateLimit: RATE_LIMITS.login },
  async ({ request, supabase }) => {
    const result = await login(supabase, await readJson(request));
    await resetRateLimit(RATE_LIMITS.login, getClientIp(request));
    return { data: result };
  },
);
