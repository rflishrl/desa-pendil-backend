import "server-only";

import { z } from "zod";

import { toActor, type Actor } from "@/lib/auth/actor";
import { AppError } from "@/lib/api/errors";
import {
  consumeRateLimit,
  getClientIp,
  type RateLimitRule,
} from "@/lib/api/rate-limit";
import { assertSameOrigin, isSafeMethod } from "@/lib/api/request";
import type { ApiResponse } from "@/lib/api/types";
import { ConfigError, getAllowedOrigins } from "@/lib/env";
import { log } from "@/lib/log";
import {
  createPublicClient,
  createSessionClient,
  type AppSupabaseClient,
} from "@/lib/supabase/server";

type Access = "public" | "session" | "admin";

interface WithApiOptions<A extends Access> {
  /**
   * - `public`: tanpa sesi. Supabase berjalan sebagai `anon`, jadi RLS publik berlaku.
   * - `session`: client dengan cookie sesi, tanpa syarat login (untuk login/logout).
   * - `admin`: wajib login (getUser) dan berperan admin. Supabase memakai sesi user.
   */
  access: A;
  /** Batas percobaan per IP. Wajib untuk endpoint publik yang menulis (mis. login). */
  rateLimit?: RateLimitRule;
  /** Cek header Origin untuk metode ubah-data. Bawaan: aktif. */
  sameOrigin?: boolean;
}

interface BaseContext<P> {
  request: Request;
  params: P;
  requestId: string;
  supabase: AppSupabaseClient;
}

export type ApiContext<A extends Access, P> = BaseContext<P> &
  (A extends "admin" ? { actor: Actor } : { actor: null });

export interface ApiResult<T> {
  data: T;
  status?: number;
}

interface RouteContext<P> {
  params: Promise<P>;
}

/*
 * Semua respons API, termasuk GET publik, tidak boleh disimpan cache bersama (CDN).
 * Frontend (desa-pendil) sudah punya cache sendiri selama 1 jam yang dibuang lewat tag saat admin
 * menyimpan atau menghapus data. Kalau CDN backend ikut menyimpan daftar lama, frontend bisa
 * mengambil daftar lama itu tepat saat menyegarkan halaman, dan data yang sudah dihapus
 * tampil lagi sampai 1 jam.
 */
const NO_STORE = "private, no-store";

function json<T>(body: ApiResponse<T>, status: number): Response {
  return Response.json(body, { status });
}

function toFailure(
  error: unknown,
  requestId: string,
  request: Request,
): Response {
  const where = {
    requestId,
    method: request.method,
    path: new URL(request.url).pathname,
  };

  if (error instanceof AppError) {
    if (error.status >= 500) log("error", error.message, { ...where, error });
    else if (error.cause) log("warn", error.message, { ...where, error });
    const response = json(
      { success: false, error: error.message },
      error.status,
    );
    if (error.retryAfterSeconds !== undefined) {
      response.headers.set("Retry-After", String(error.retryAfterSeconds));
    }
    return response;
  }
  if (error instanceof z.ZodError) {
    const first = error.issues[0]?.message;
    return json(
      { success: false, error: first ?? "Data yang dikirim tidak valid." },
      422,
    );
  }
  if (error instanceof ConfigError) {
    log("error", "konfigurasi server belum lengkap", { ...where, error });
    return json(
      { success: false, error: "Server belum dikonfigurasi dengan benar." },
      500,
    );
  }

  log("error", "error tak terduga", { ...where, error });
  return json({ success: false, error: "Terjadi kesalahan pada server." }, 500);
}

function applyCors(request: Request, response: Response): void {
  const origin = request.headers.get("origin");
  if (origin && getAllowedOrigins().includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.append("Vary", "Origin");
  }
}

/**
 * Pembungkus semua Route Handler. Urutannya:
 * cek Origin -> rate limit -> sesi & peran -> handler -> ApiResponse.
 * Semua error dipetakan ke status HTTP; detail teknis hanya masuk log (dengan requestId).
 */
export function withApi<
  A extends Access,
  P = Record<string, never>,
  T = unknown,
>(
  options: WithApiOptions<A>,
  handler: (context: ApiContext<A, P>) => Promise<ApiResult<T>>,
) {
  return async (
    request: Request,
    route?: RouteContext<P>,
  ): Promise<Response> => {
    const requestId = request.headers.get("x-vercel-id") ?? crypto.randomUUID();
    let response: Response;

    try {
      if (options.sameOrigin !== false && !isSafeMethod(request.method)) {
        assertSameOrigin(request);
      }
      if (options.rateLimit) {
        await consumeRateLimit(
          options.rateLimit,
          getClientIp(request),
          requestId,
        );
      }

      const params = (route ? await route.params : {}) as P;
      let resolved: BaseContext<P> & { actor: Actor | null };

      if (options.access === "admin") {
        const supabase = await createSessionClient();
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          throw new AppError(
            "UNAUTHENTICATED",
            "Anda harus login sebagai admin.",
          );
        }
        const actor = toActor(data.user);
        if (actor.role !== "admin") {
          throw new AppError("FORBIDDEN", "Akun ini bukan admin.");
        }
        resolved = { request, params, requestId, supabase, actor };
      } else {
        const supabase =
          options.access === "session"
            ? await createSessionClient()
            : createPublicClient();
        resolved = { request, params, requestId, supabase, actor: null };
      }

      // Aman: `actor` terisi jika dan hanya jika access === "admin" (dicek di atas).
      const result = await handler(resolved as unknown as ApiContext<A, P>);
      response = json(
        { success: true, data: result.data },
        result.status ?? 200,
      );
      if (options.access === "public") applyCors(request, response);
      response.headers.set("Cache-Control", NO_STORE);
    } catch (error) {
      response = toFailure(error, requestId, request);
      response.headers.set("Cache-Control", NO_STORE);
      if (options.access === "public") applyCors(request, response);
    }

    response.headers.set("x-request-id", requestId);
    return response;
  };
}
