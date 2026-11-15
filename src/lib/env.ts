import { z } from "zod";

/** Thrown when the environment is incomplete. The message is for server logs only. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const requiredTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1),
);

const requiredHttpsUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .url("must be a valid URL")
    .refine((value) => value.startsWith("https://"), "must use https:// scheme")
    .transform((value) => value.replace(/\/+$/, "")),
);

function optionalPositiveNumber(defaultValue: number, max?: number) {
  let schema = z.coerce.number().finite().positive();
  if (max !== undefined) {
    schema = schema.max(max);
  }
  return z.preprocess(
    (value) =>
      value === undefined || (typeof value === "string" && value.trim() === "")
        ? defaultValue
        : value,
    schema,
  );
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
  R2_ACCESS_KEY_ID: requiredTrimmedString,
  R2_SECRET_ACCESS_KEY: requiredTrimmedString,
  R2_ENDPOINT: requiredHttpsUrl,
  R2_BUCKET_NAME: requiredTrimmedString,
  R2_PUBLIC_DOMAIN: requiredHttpsUrl,
  R2_APP_QUOTA_MB: optionalPositiveNumber(2560),
  MAX_UPLOAD_MB: optionalPositiveNumber(4, 4),
  ALLOWED_ORIGINS: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().trim().optional(),
  TURNSTILE_ALLOWED_HOSTNAMES: z.string().trim().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

/** Clears cached server environment (intended for unit tests). */
export function resetServerEnvCache(): void {
  cachedServerEnv = undefined;
}

/**
 * Returns true for local and Vercel Preview environments so non-production uploads
 * use the `dev/` object key prefix inside the shared application bucket.
 */
export function isNonProductionMediaEnv(
  envSource: Record<string, string | undefined> = process.env,
): boolean {
  if (envSource.VERCEL_ENV) {
    return envSource.VERCEL_ENV !== "production";
  }
  return envSource.NODE_ENV !== "production";
}

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
