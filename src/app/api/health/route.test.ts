import { beforeEach, describe, expect, it, vi } from "vitest";

import { readBody, sameOriginRequest } from "../../../../test/api";

const pingDatabase = vi.fn();

vi.mock("@/features/health/repository", () => ({
  pingDatabase: (...args: unknown[]) => pingDatabase(...args),
}));
vi.mock("@/lib/supabase/server", () => ({
  createPublicClient: () => ({}),
  createSessionClient: async () => ({}),
}));
vi.mock("@/lib/api/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/rate-limit")>()),
  consumeRateLimit: async () => undefined,
}));

const { GET } = await import("@/app/api/health/route");
const { checkHealth } = await import("@/features/health/service");

beforeEach(() => {
  pingDatabase.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("checkHealth (service)", () => {
  it("ok jika database menjawab", async () => {
    pingDatabase.mockResolvedValue(undefined);
    await expect(checkHealth({} as never)).resolves.toEqual({
      status: "ok",
      database: "ok",
    });
  });

  it("melempar UNAVAILABLE jika database gagal", async () => {
    pingDatabase.mockRejectedValue(new Error("timeout"));
    await expect(checkHealth({} as never)).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });
});

describe("GET /api/health", () => {
  it("200 dan tidak di-cache jika database menjawab", async () => {
    pingDatabase.mockResolvedValue(undefined);
    const response = await GET(sameOriginRequest("/api/health"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await readBody(response)).toEqual({
      success: true,
      data: { status: "ok", database: "ok" },
    });
  });

  it("503 tanpa detail error jika database gagal", async () => {
    pingDatabase.mockRejectedValue(new Error("password authentication failed"));
    const response = await GET(sameOriginRequest("/api/health"));
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain("password");
    expect(JSON.parse(text)).toEqual({
      success: false,
      error: "Database tidak dapat dijangkau.",
    });
  });
});
