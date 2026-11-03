import { z } from "zod";

/** Thrown when the environment is incomplete. The message is for server logs only. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/*
 * Every value is read on the server only, so none of them use the public Next.js
 * prefix. The browser never talks to Supabase.
 */
const serverEnvSchema = z.object({
  SUPABASE_URL: z.url({
    protocol: /^https?$/,
    error: "must be the Supabase project URL (https://xxxx.supabase.co)",
  }),
  SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .startsWith(
      "sb_publishable_",
      "must be a publishable key (sb_publishable_...)",
    ),
  // Bypasses RLS. Only used in src/lib/supabase/admin.ts.
  SUPABASE_SECRET_KEY: z
    .string()
    .trim()
    .startsWith("sb_secret_", "must be a secret key (sb_secret_...)"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),
  // Sent by Vercel Cron in the Authorization header. Empty = the cron endpoint is off.
  CRON_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

/** Reads and validates the environment on first use (not at build time). */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")} ${issue.message}`)
      .join("; ");
    throw new ConfigError(`Incomplete environment: ${problems}`);
  }

  cachedServerEnv = result.data;
  return cachedServerEnv;
}

/** Frontend origins allowed to read the API from the browser (CORS). */
export function getAllowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
