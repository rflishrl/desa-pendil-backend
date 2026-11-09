import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { readBody, sameOriginRequest } from "../../../test/api";

const getCurrentAdmin = vi.fn();
const consumeRateLimit = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: (...args: unknown[]) => getCurrentAdmin(...args),
}));
vi.mock("@/lib/api/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/rate-limit")>()),
  consumeRateLimit: (...args: unknown[]) => consumeRateLimit(...args),
}));

const { withApi } = await import("@/lib/api/with-api");
const { AppError } = await import("@/lib/api/errors");

const ADMIN = {
  id: "a1",
  email: "admin@desa-pendil.id",
  role: "admin" as const,
};

beforeEach(() => {
  getCurrentAdmin.mockReset();
  consumeRateLimit.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("withApi: response envelope", () => {
  it("wraps success in { success: true, data } with request id", async () => {
    const GET = withApi({ access: "public" }, async () => ({
      data: { status: "ok" },
    }));
    const response = await GET(sameOriginRequest("/api/x"));

    expect(response.status).toBe(200);
    expect(await readBody(response)).toEqual({
      success: true,
      data: { status: "ok" },
    });
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("public GET responses are private, no-store by default", async () => {
    const GET = withApi({ access: "public" }, async () => ({ data: [] }));
    const response = await GET(sameOriginRequest("/api/x"));
    const cacheControl = response.headers.get("cache-control") ?? "";

    expect(cacheControl).toBe("private, no-store");
  });

  it("public GET responses use custom cacheControl when provided", async () => {
    const GET = withApi({ access: "public", cacheControl: "public, s-maxage=60" }, async () => ({
      data: [],
    }));
    const response = await GET(sameOriginRequest("/api/x"));

    expect(response.headers.get("cache-control")).toBe("public, s-maxage=60");
  });

  it("maps AppError to corresponding HTTP status code", async () => {
    const GET = withApi({ access: "public" }, async () => {
      throw new AppError("NOT_FOUND", "Item tidak ditemukan.");
    });
    const response = await GET(sameOriginRequest("/api/x"));

    expect(response.status).toBe(404);
    expect(await readBody(response)).toEqual({
      success: false,
      error: "Item tidak ditemukan.",
    });
  });

  it("maps ZodError to 422 with first error message", async () => {
    const GET = withApi({ access: "public" }, async () => {
      z.object({ name: z.string().min(3, "Nama minimal 3 karakter.") }).parse({
        name: "a",
      });
      return { data: null };
    });
    const response = await GET(sameOriginRequest("/api/x"));

    expect(response.status).toBe(422);
    expect(await readBody(response)).toEqual({
      success: false,
      error: "Nama minimal 3 karakter.",
    });
  });

  it("blocks cross-origin mutations (POST) without same-origin header", async () => {
    const POST = withApi({ access: "public" }, async () => ({ data: null }));
    const response = await POST(
      new Request("http://localhost:4000/api/x", {
        method: "POST",
        headers: { host: "localhost:4000", origin: "https://evil.example" },
      }),
    );
    expect(response.status).toBe(403);
  });
});

describe("withApi: access control and rate limits", () => {
  it("rejects when rate limit is exceeded with 429 and Retry-After", async () => {
    consumeRateLimit.mockRejectedValue(
      new AppError("RATE_LIMITED", "Too many requests.", {
        retryAfterSeconds: 120,
      }),
    );
    const handler = vi.fn(async () => ({ data: null }));
    const GET = withApi(
      {
        access: "public",
        rateLimit: { name: "t", limit: 1, windowSeconds: 60 },
      },
      handler,
    );
    const response = await GET(sameOriginRequest("/api/x"));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 401 for admin endpoint when not logged in", async () => {
    getCurrentAdmin.mockResolvedValue(null);
    const GET = withApi({ access: "admin" }, async () => ({ data: null }));
    expect((await GET(sameOriginRequest("/api/x"))).status).toBe(401);
  });

  it("passes authenticated actor to admin handler and ensures no-store cache", async () => {
    getCurrentAdmin.mockResolvedValue(ADMIN);
    const GET = withApi({ access: "admin" }, async ({ actor }) => ({
      data: actor,
    }));
    const response = await GET(sameOriginRequest("/api/x"));
    expect(await readBody(response)).toEqual({
      success: true,
      data: ADMIN,
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
