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
 * prefix. The browser never accesses database credentials.
 */
const serverEnvSchema = z.object({
  DATABASE_URI: z
    .string()
    .trim()
    .min(1, "must be the Neon PostgreSQL connection string (postgresql://...)"),
  SESSION_SECRET: z.string().trim().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

/** Reads and validates the environment on first use (not at build time). */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const envSource = {
    ...process.env,
    DATABASE_URI:
      process.env.DATABASE_URI ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL,
  };

  const result = serverEnvSchema.safeParse(envSource);
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
