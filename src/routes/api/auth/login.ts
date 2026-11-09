import { createFileRoute } from "@tanstack/react-router";

import { login } from "@/features/auth/service";
import { AppError } from "@/lib/api/errors";
import { getClientIp, resetRateLimit } from "@/lib/api/rate-limit";
import { RATE_LIMITS } from "@/lib/api/rate-limits";
import { readJson } from "@/lib/api/request";
import { withApi } from "@/lib/api/with-api";
import { verifyTurnstile } from "@/server/turnstile";

const handlePost = withApi(
  { access: "session", rateLimit: RATE_LIMITS.login },
  async ({ request }) => {
    const clientIp = getClientIp(request);
    const body = (await readJson(request)) as { turnstileToken?: string };

    const verification = await verifyTurnstile({
      token: body?.turnstileToken ?? "",
      expectedAction: "login",
      clientIp,
    });

    if (!verification.success) {
      throw new AppError("VALIDATION", "Verifikasi gagal.");
    }

    const result = await login(body);
    await resetRateLimit(RATE_LIMITS.login, clientIp);
    return { data: result };
  },
);

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: handlePost,
    },
  },
});

export { handlePost as POST };
