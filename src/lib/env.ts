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
  SESSION_SECRET: z
    .string()
    .trim()
    .min(32, "must be at least 32 characters long")
    .optional()
    .refine((val) => process.env.NODE_ENV !== "production" || Boolean(val && val.length >= 32), {
      message: "is required and must be at least 32 characters in production",
    }),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().trim().optional(),
  TURNSTILE_ALLOWED_HOSTNAMES: z.string().trim().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

/** Reads and validates the environment on first use (not at build time). */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const envSource = {
    ...process.env,
    DATABASE_URI: process.env.DATABASE_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL,
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

/** Secret key used by server-side Cloudflare Turnstile siteverify. */
export function getTurnstileSecretKey(): string {
  const env = getServerEnv();
  const key =
    env.TURNSTILE_SECRET_KEY ||
    (process.env.NODE_ENV !== "production" ? "1x0000000000000000000000000000000AA" : undefined);
  if (!key) {
    throw new ConfigError("TURNSTILE_SECRET_KEY belum dikonfigurasi di environment.");
  }
  return key;
}

/** Hostnames allowed for Turnstile validation (e.g. ['desapendil.id', 'admin.desapendil.id']). */
export function getTurnstileAllowedHostnames(): string[] {
  const env = getServerEnv();
  const raw = env.TURNSTILE_ALLOWED_HOSTNAMES;
  if (raw) {
    return raw
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
  }
  if (process.env.NODE_ENV !== "production") {
    return ["localhost", "127.0.0.1", "example.com"];
  }
  return [];
}
