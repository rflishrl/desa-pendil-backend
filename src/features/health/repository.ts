import "server-only";

import type { AppSupabaseClient } from "@/lib/supabase/server";

const DB_TIMEOUT_MS = 3_000;

/** Query paling ringan ke database (tanpa mengambil baris). Melempar jika gagal atau lewat 3 detik. */
export async function pingDatabase(supabase: AppSupabaseClient): Promise<void> {
  const { error } = await supabase
    .from("gallery_images")
    .select("id", { head: true })
    .limit(1)
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  if (error) throw error;
}
