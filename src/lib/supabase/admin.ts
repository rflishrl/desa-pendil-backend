import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Client dengan secret key. MELEWATI RLS, jadi hanya untuk operasi yang memang
 * tidak bisa berjalan sebagai user. Daftar pemakaian yang diizinkan:
 *
 * 1. Rate limit (src/lib/api/rate-limit.ts): tabel penghitung ada di skema `private`
 *    dan fungsinya hanya boleh dijalankan `service_role`, supaya orang luar tidak bisa
 *    mengisi atau mengosongkan penghitung orang lain.
 * 2. Cron pembersih foto (features/uploads): harus melihat foto produk yang tidak aktif,
 *    padahal cron tidak punya sesi admin.
 * 3. Script `scripts/create-admin.mjs`: membuat akun admin dan mengisi app_metadata.role.
 *
 * Jangan pakai client ini untuk request dari pengguna.
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
