import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import {
  SESSION_COOKIE_OPTIONS,
  withSessionLifetime,
} from "@/lib/supabase/cookie-options";
import type { Database } from "@/types/database";

/**
 * Refreshes Supabase session tokens before Next.js page rendering.
 * Server Components cannot mutate cookies, so session token refreshes occur here.
 * Returns the final NextResponse constructed by `setAll` to preserve updated cookies.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const env = getServerEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, withSessionLifetime(options));
          }
          // Anti-caching headers from SSR client: session-bearing responses must not be cached.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Avoid intervening code between createServerClient and getClaims().
  // getClaims() validates the JWT token and refreshes near-expiry sessions.
  await supabase.auth.getClaims();

  return response;
}
