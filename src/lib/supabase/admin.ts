import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Service role client. Bypasses Row Level Security (RLS) and is strictly limited
 * to internal administrative tasks:
 *
 * 1. Rate limiting (src/lib/api/rate-limit.ts): counters live in private schema
 *    accessible only by service_role.
 * 2. Upload cleanup background job (features/uploads): requires querying unreferenced assets
 *    outside an active admin session.
 * 3. Administrative tooling (`scripts/create-admin.mjs`): managing user accounts and metadata.
 *
 * Do not use this client for regular user requests.
 */
export function createAdminClient(): AppSupabaseClient {
  const env = getServerEnv();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
