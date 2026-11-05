import "server-only";

import { pingDatabase } from "@/features/health/repository";
import { AppError } from "@/lib/api/errors";
import type { AppSupabaseClient } from "@/lib/supabase/server";

export interface HealthStatus {
  status: "ok";
  database: "ok";
}

/** Health check verifying application server and database connectivity. */
export async function checkHealth(
  supabase: AppSupabaseClient,
): Promise<HealthStatus> {
  try {
    await pingDatabase(supabase);
  } catch (cause) {
    throw new AppError("UNAVAILABLE", "Database tidak dapat dijangkau.", {
      cause,
    });
  }
  return { status: "ok", database: "ok" };
}
