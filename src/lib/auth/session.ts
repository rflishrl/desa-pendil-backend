import "server-only";

import { cache } from "react";

import { toActor, type Actor } from "@/lib/auth/actor";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Returns currently authenticated admin actor or `null`.
 * Uses getUser() to validate the token against Supabase Auth, avoiding unverified getSession().
 * Wrapped in React cache() to deduplicate calls within a single request.
 */
export const getCurrentAdmin = cache(async (): Promise<Actor | null> => {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const actor = toActor(data.user);
  return actor.role === "admin" ? actor : null;
});
