import type { User } from "@supabase/supabase-js";

/** Authenticated actor representing caller context in the service layer. */
export interface Actor {
  id: string;
  email: string;
  role: "admin" | "user";
}

/**
 * Role is read from `app_metadata` rather than `user_metadata`: app_metadata is
 * immutable to end users and can only be set via administrative service role keys.
 */
export function toActor(user: User): Actor {
  const role = user.app_metadata?.role === "admin" ? "admin" : "user";
  return { id: user.id, email: user.email ?? "", role };
}
