import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import {
  SESSION_COOKIE_OPTIONS,
  withSessionLifetime,
} from "@/lib/supabase/cookie-options";
import type { Database } from "@/types/database";

/**
 * Memperbarui token sesi Supabase sebelum halaman dirender. Server Component tidak
 * boleh menulis cookie, jadi pembaruan token harus terjadi di sini.
 *
 * Yang dikembalikan harus `response` terakhir yang dibuat `setAll`; respons lain tidak
 * membawa cookie baru, dan user akan keluar sendiri pada request berikutnya.
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
          // Header anti-cache dari library: respons yang membawa sesi tidak boleh di-cache.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Jangan taruh kode lain di antara createServerClient dan getClaims().
  // getClaims() memverifikasi token dan memperbaruinya jika hampir kedaluwarsa.
  await supabase.auth.getClaims();

  return response;
}
