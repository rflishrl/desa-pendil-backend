import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/** Driver-agnostic handle, so tests can inject PGlite and the app uses postgres.js. */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };
let override: Database | undefined;

export function getDb(): Database {
  if (override) return override;

  // Reuse one client across hot reloads and warm serverless invocations.
  globalForDb.__sql ??= postgres(getEnv().DATABASE_URL, {
    max: process.env.VERCEL ? 1 : 10,
    // Required for pooled connections (Neon / PgBouncer transaction mode).
    prepare: false,
    idle_timeout: 20,
  });
  return drizzle(globalForDb.__sql, { schema });
}

/** Test hook: route every service call to the given database. */
export function setDbForTests(db: Database | undefined): void {
  override = db;
}

export { schema };
