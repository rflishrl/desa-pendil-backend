import "server-only";

import { z } from "zod";

import type { Actor } from "@/lib/auth/actor";
import { getCurrentAdmin } from "@/lib/auth/session";
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

type Access = "public" | "session" | "admin";

interface WithApiOptions<A extends Access> {
  access: A;
  rateLimit?: RateLimitRule;
  sameOrigin?: boolean;
}

interface BaseContext<P> {
  request: Request;
  params: P;
  requestId: string;
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
 * Wraps Route Handlers:
 * verifies Origin -> checks rate limit -> authenticates session -> invokes handler -> returns ApiResponse.
 * Maps application errors to HTTP status codes with structured logging.
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
        const actor = await getCurrentAdmin();
        if (!actor) {
          throw new AppError(
            "UNAUTHENTICATED",
            "Anda harus login sebagai admin.",
          );
        }
        resolved = { request, params, requestId, actor };
      } else {
        resolved = { request, params, requestId, actor: null };
      }

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
