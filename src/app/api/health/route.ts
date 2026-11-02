import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Liveness + database check, used by the Docker HEALTHCHECK and uptime monitors. */
export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return json({ status: "ok" });
  } catch {
    return json({ status: "error" }, { status: 503 });
  }
}
