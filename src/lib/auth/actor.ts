import type { User } from "@supabase/supabase-js";

/** User yang sedang memanggil, dalam bentuk yang dipakai lapisan service. */
export interface Actor {
  id: string;
  email: string;
  role: "admin" | "user";
}

/**
 * Peran dibaca dari `app_metadata`, bukan `user_metadata`: app_metadata hanya bisa
 * diubah dengan secret key, sedangkan user_metadata bisa diubah user sendiri.
 */
export function toActor(user: User): Actor {
  const role = user.app_metadata?.role === "admin" ? "admin" : "user";
  return { id: user.id, email: user.email ?? "", role };
}
