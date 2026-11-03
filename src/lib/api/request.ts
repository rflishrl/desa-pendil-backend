import type { ZodType } from "zod";

import { AppError } from "@/lib/api/errors";

/** Membaca body JSON; body yang bukan JSON dijawab 400. Validasi isi dilakukan service. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Body harus berupa JSON yang valid.");
  }
}

/** Membaca body JSON lalu memvalidasinya dengan skema Zod (error Zod -> 422). */
export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  return schema.parse(await readJson(request));
}

/** Memvalidasi query string (?q=&page=...) dengan skema Zod. */
export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  const params = new URL(request.url).searchParams;
  return schema.parse(Object.fromEntries(params));
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase());
}

/** Menolak permintaan ubah-data dari situs lain (perlindungan CSRF). */
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
