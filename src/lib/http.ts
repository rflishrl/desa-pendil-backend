import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getEnv } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

/** Adds CORS headers when the caller's Origin is whitelisted in FRONTEND_ORIGINS. */
export function withCors(request: Request, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");
  if (origin && getEnv().allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return response;
}

export function preflight(request: Request): NextResponse {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

/** Wraps a route handler: validation errors -> 422, ApiError -> its status, rest -> 500. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) {
      return json(
        {
          error: "Validation failed",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 },
      );
    }
    if (error instanceof ApiError) {
      return json({ error: error.message, details: error.details }, { status: error.status });
    }
    console.error("[api] unhandled error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

export function parsePage(value: string | null, fallback = 1): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
