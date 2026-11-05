import "server-only";

import type { User } from "@supabase/supabase-js";

import type { AppSupabaseClient } from "@/lib/supabase/server";

/** Authenticates with email and password; returns User or null if invalid. */
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

/** Terminates session in Supabase and clears session cookies. */
export async function signOut(supabase: AppSupabaseClient): Promise<unknown> {
  const { error } = await supabase.auth.signOut();
  return error;
}
