import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { getServerEnv } from "@/lib/env";

export type DbClient = NeonQueryFunction<false, false>;

let client: DbClient | undefined;

/** Returns the Neon SQL query function for serverless queries over HTTPS. */
export function getDb(): DbClient {
  if (client) return client;
  const env = getServerEnv();
  client = neon(env.DATABASE_URI);
  return client;
}
