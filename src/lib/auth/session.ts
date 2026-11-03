import "server-only";

import { cache } from "react";

import { toActor, type Actor } from "@/lib/auth/actor";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Mengembalikan admin yang sedang login, atau `null`. Memakai getUser(), yang
 * memeriksa token ke server Auth Supabase, bukan getSession() yang hanya membaca cookie.
 * `cache`: layout dan halaman dalam satu request berbagi satu pemeriksaan.
 */
export const getCurrentAdmin = cache(async (): Promise<Actor | null> => {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const actor = toActor(data.user);
  return actor.role === "admin" ? actor : null;
});
