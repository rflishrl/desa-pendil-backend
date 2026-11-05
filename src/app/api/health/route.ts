import { checkHealth } from "@/features/health/service";
import { RATE_LIMITS } from "@/lib/api/rate-limits";
import { withApi } from "@/lib/api/with-api";

// Always evaluated per request; never cached.
export const dynamic = "force-dynamic";
export const maxDuration = 10;

/** 200 when server and database are healthy; 503 if database is unreachable. */
export const GET = withApi(
  { access: "public", rateLimit: RATE_LIMITS.health },
  async ({ supabase }) => ({ data: await checkHealth(supabase) }),
);
