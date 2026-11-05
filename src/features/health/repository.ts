import "server-only";

import type { AppSupabaseClient } from "@/lib/supabase/server";

const DB_TIMEOUT_MS = 3_000;

/** Lightweight database connectivity check with 3-second timeout. */
export async function pingDatabase(supabase: AppSupabaseClient): Promise<void> {
  const { error } = await supabase
    .from("gallery_images")
    .select("id", { head: true })
    .limit(1)
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  if (error) throw error;
}
