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
 * Client dengan sesi user dari cookie (publishable key). Ini pilihan bawaan:
 * query berjalan sebagai user yang login, jadi RLS berlaku.
 * Buat baru untuk setiap request; jangan disimpan di variabel modul.
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
            // Dipanggil dari Server Component yang tidak boleh menulis cookie.
            // Aman diabaikan: src/proxy.ts yang memperbarui sesi.
          }
        },
      },
    },
  );
}

/**
 * Client tanpa sesi untuk pembaca publik (peran `anon`). Tidak membaca atau menulis
 * cookie, jadi respons publik tidak pernah membawa sesi siapa pun.
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
