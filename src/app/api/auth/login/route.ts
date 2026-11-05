import { login } from "@/features/auth/service";
import { getClientIp, resetRateLimit } from "@/lib/api/rate-limit";
import { RATE_LIMITS } from "@/lib/api/rate-limits";
import { readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 10;

/** Admin login. Rate limited to 8 attempts per 10 minutes per IP. */
export const POST = withApi(
  { access: "session", rateLimit: RATE_LIMITS.login },
  async ({ request }) => {
    const result = await login(await readJson(request));
    await resetRateLimit(RATE_LIMITS.login, getClientIp(request));
    return { data: result };
  },
);
