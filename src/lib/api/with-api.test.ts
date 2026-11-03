import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { readBody, sameOriginRequest } from "../../../test/api";

const getUser = vi.fn();
const sessionClient = { auth: { getUser } };
const publicClient = { kind: "public" };
const consumeRateLimit = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSessionClient: async () => sessionClient,
  createPublicClient: () => publicClient,
}));
vi.mock("@/lib/api/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/rate-limit")>()),
  consumeRateLimit: (...args: unknown[]) => consumeRateLimit(...args),
}));

const { withApi } = await import("@/lib/api/with-api");
const { AppError } = await import("@/lib/api/errors");

const ADMIN = {
  id: "a1",
  email: "admin@sinarberkah.com",
  app_metadata: { role: "admin" },
};
const USER = { id: "u1", email: "user@sinarberkah.com", app_metadata: {} };

beforeEach(() => {
  getUser.mockReset();
  consumeRateLimit.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("withApi: bentuk respons", () => {
  it("sukses dibungkus { success: true, data } dengan request id", async () => {
    const GET = withApi({ access: "public" }, async ({ supabase }) => ({
      data: { client: (supabase as unknown as typeof publicClient).kind },
    }));
    const response = await GET(sameOriginRequest("/api/x"));

    expect(response.status).toBe(200);
    expect(await readBody(response)).toEqual({
      success: true,
      data: { client: "public" },
    });
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("GET publik tidak boleh disimpan cache CDN (regresi: data terhapus tampil lagi)", async () => {
    const GET = withApi({ access: "public" }, async () => ({ data: [] }));
    const response = await GET(sameOriginRequest("/api/x"));
    const cacheControl = response.headers.get("cache-control") ?? "";

    expect(cacheControl).toBe("private, no-store");
    expect(cacheControl).not.toMatch(/s-maxage|stale-while-revalidate|public/);
  });

  it("status kustom dipakai (mis. 201)", async () => {
    const POST = withApi({ access: "public" }, async () => ({
      data: 1,
      status: 201,
    }));
    const response = await POST(
      sameOriginRequest("/api/x", { method: "POST" }),
    );
    expect(response.status).toBe(201);
  });

  it("AppError dipetakan ke status dan pesannya, tanpa membocorkan cause", async () => {
    const GET = withApi({ access: "public" }, async () => {
      throw new AppError("CONFLICT", "Data yang sama sudah ada.", {
        cause: new Error(
          'duplicate key value violates unique constraint "products_pkey"',
        ),
      });
    });
    const response = await GET(sameOriginRequest("/api/x"));
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toEqual({
      success: false,
      error: "Data yang sama sudah ada.",
    });
    expect(text).not.toContain("products_pkey");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("ZodError menjadi 422 dengan pesan issue pertama", async () => {
    const GET = withApi({ access: "public" }, async () => {
      z.object({ name: z.string().min(2, "Nama minimal 2 karakter.") }).parse({
        name: "a",
      });
      return { data: null };
    });
    const response = await GET(sameOriginRequest("/api/x"));
    expect(response.status).toBe(422);
    expect(await readBody(response)).toEqual({
      success: false,
      error: "Nama minimal 2 karakter.",
    });
  });

  it("error tak terduga menjadi 500 dengan pesan umum", async () => {
    const GET = withApi({ access: "public" }, async () => {
      throw new Error("connection string postgres://secret@host");
    });
    const response = await GET(sameOriginRequest("/api/x"));
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(text).not.toContain("secret");
  });
});

describe("withApi: keamanan", () => {
  it("metode ubah-data tanpa Origin yang sama ditolak 403", async () => {
    const handler = vi.fn(async () => ({ data: null }));
    const POST = withApi({ access: "public" }, handler);
    const response = await POST(
      sameOriginRequest("/api/x", {
        method: "POST",
        headers: { origin: "https://jahat.example" },
      }),
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("rate limit terlampaui: 429 + Retry-After, handler tidak jalan", async () => {
    consumeRateLimit.mockRejectedValue(
      new AppError("RATE_LIMITED", "Terlalu banyak percobaan.", {
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

  it("admin: belum login = 401", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("no session"),
    });
    const GET = withApi({ access: "admin" }, async () => ({ data: null }));
    expect((await GET(sameOriginRequest("/api/x"))).status).toBe(401);
  });

  it("admin: login tapi bukan admin = 403", async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const GET = withApi({ access: "admin" }, async () => ({ data: null }));
    expect((await GET(sameOriginRequest("/api/x"))).status).toBe(403);
  });

  it("admin: handler menerima actor dan respons tidak di-cache", async () => {
    getUser.mockResolvedValue({ data: { user: ADMIN }, error: null });
    const GET = withApi({ access: "admin" }, async ({ actor }) => ({
      data: actor,
    }));
    const response = await GET(sameOriginRequest("/api/x"));
    expect(await readBody(response)).toEqual({
      success: true,
      data: { id: "a1", email: "admin@sinarberkah.com", role: "admin" },
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("role dari user_metadata diabaikan", async () => {
    getUser.mockResolvedValue({
      data: { user: { ...USER, user_metadata: { role: "admin" } } },
      error: null,
    });
    const GET = withApi({ access: "admin" }, async () => ({ data: null }));
    expect((await GET(sameOriginRequest("/api/x"))).status).toBe(403);
  });

  it("params route diteruskan ke handler", async () => {
    const GET = withApi<"public", { id: string }>(
      { access: "public" },
      async ({ params }) => ({
        data: params.id,
      }),
    );
    const response = await GET(sameOriginRequest("/api/x/1"), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(await readBody(response)).toEqual({ success: true, data: "abc" });
  });
});
