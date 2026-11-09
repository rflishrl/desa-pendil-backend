import { getDb } from "@/lib/db/client";

/** Lightweight database connectivity check. */
export async function pingDatabase(): Promise<void> {
  const sql = getDb();
  await sql`SELECT 1`;
}
