import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  FRONTEND_ORIGINS: z.string().default("http://localhost:3000"),
  PUBLIC_BASE_URL: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  UPLOAD_DIR: z.string().default(".uploads"),
});

export type Env = z.infer<typeof schema> & { allowedOrigins: string[] };

let cached: Env | undefined;

/** Validated environment, read lazily so `next build` does not need secrets. */
export function getEnv(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${problems}`);
  }

  cached = {
    ...parsed.data,
    allowedOrigins: parsed.data.FRONTEND_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  };
  return cached;
}
