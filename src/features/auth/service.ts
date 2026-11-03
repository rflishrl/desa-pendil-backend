import "server-only";

import { signInWithPassword, signOut } from "@/features/auth/repository";
import { loginSchema, type LoginResult } from "@/features/auth/schemas";
import { toActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/api/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";

/**
 * Login admin. Kredensial salah dan akun bukan admin sama-sama ditolak; akun bukan
 * admin langsung dikeluarkan lagi supaya tidak tertinggal sesi yang tidak berguna.
 */
export async function login(
  supabase: AppSupabaseClient,
  rawInput: unknown,
): Promise<LoginResult> {
  const { email, password } = loginSchema.parse(rawInput);

  const { user, error } = await signInWithPassword(supabase, email, password);
  if (error || !user) {
    throw new AppError("UNAUTHENTICATED", "Email atau password salah.", {
      cause: error,
    });
  }

  if (toActor(user).role !== "admin") {
    await signOut(supabase);
    throw new AppError("FORBIDDEN", "Akun ini tidak punya akses admin.");
  }

  return { email: user.email ?? email };
}

/** Logout. Selalu berhasil dari sisi pengguna; kegagalan di Supabase hanya dicatat. */
export async function logout(
  supabase: AppSupabaseClient,
): Promise<{ loggedOut: true }> {
  const error = await signOut(supabase);
  if (error) {
    throw new AppError("INTERNAL", "Gagal keluar. Coba lagi.", {
      cause: error,
    });
  }
  return { loggedOut: true };
}
