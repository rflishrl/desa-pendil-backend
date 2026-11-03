import "server-only";

import type { User } from "@supabase/supabase-js";

import type { AppSupabaseClient } from "@/lib/supabase/server";

/** Login email + password. Mengembalikan user, atau `null` jika kredensial ditolak. */
export async function signInWithPassword(
  supabase: AppSupabaseClient,
  email: string,
  password: string,
): Promise<{ user: User | null; error: unknown }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { user: data.user, error };
}

/** Mengakhiri sesi di Supabase dan menghapus cookie sesi. */
export async function signOut(supabase: AppSupabaseClient): Promise<unknown> {
  const { error } = await supabase.auth.signOut();
  return error;
}
