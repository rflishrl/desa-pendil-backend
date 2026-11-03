import { checkHealth } from "@/features/health/service";
import { RATE_LIMITS } from "@/lib/api/rate-limits";
import { withApi } from "@/lib/api/with-api";

// Selalu dijalankan saat diminta, jangan disimpan di cache.
export const dynamic = "force-dynamic";
export const maxDuration = 10;

/** 200 jika server dan database sehat, 503 jika database tidak terjangkau. */
export const GET = withApi(
  { access: "public", rateLimit: RATE_LIMITS.health },
  async ({ supabase }) => ({ data: await checkHealth(supabase) }),
);
