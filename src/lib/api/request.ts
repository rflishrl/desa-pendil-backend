import type { ZodType } from "zod";

import { AppError } from "@/lib/api/errors";

/** Parses request body as JSON; returns 400 if parsing fails. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Body must be valid JSON.");
  }
}

/** Parses and validates JSON request body against a Zod schema. */
export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  return schema.parse(await readJson(request));
}

/** Parses and validates URL search parameters against a Zod schema. */
export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  const params = new URL(request.url).searchParams;
  return schema.parse(Object.fromEntries(params));
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase());
}

/** Rejects state-changing requests originating from different hosts (CSRF defense). */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  if (!originHost || originHost !== host) {
    throw new AppError("FORBIDDEN", "Asal permintaan tidak diizinkan.");
  }
}
