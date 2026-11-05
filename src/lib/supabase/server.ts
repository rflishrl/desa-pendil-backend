import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getServerEnv } from "@/lib/env";
import {
  SESSION_COOKIE_OPTIONS,
  withSessionLifetime,
} from "@/lib/supabase/cookie-options";
import type { Database } from "@/types/database";

export type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Client using session cookies via publishable key.
 * Queries execute in the user context with RLS policies applied.
 * Creates a fresh instance per request; do not store in module scope.
 */
export async function createSessionClient(): Promise<AppSupabaseClient> {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, withSessionLifetime(options));
            }
          } catch {
            // Invoked from Server Components which cannot mutate cookies.
            // Safe to ignore: proxy.ts handles session token renewal.
          }
        },
      },
    },
  );
}

/**
 * Sessionless client for public queries using anonymous role (`anon`).
 * Does not read or write cookies, ensuring public responses remain session-free.
 */
export function createPublicClient(): AppSupabaseClient {
  const env = getServerEnv();
  return createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
