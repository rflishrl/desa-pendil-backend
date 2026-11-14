import { beforeEach, describe, expect, it, vi } from "vitest";

import { readBody, sameOriginRequest } from "../../../../../test/api";

const getCurrentAdmin = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: (...args: unknown[]) => getCurrentAdmin(...args),
}));

const { POST } = await import("@/routes/api/admin/diagnostics/image");

const ADMIN = {
  id: "a1",
  email: "admin@desapendil.id",
  role: "admin" as const,
};

const call = (headers?: Record<string, string>) =>
  POST(
    sameOriginRequest("/api/admin/diagnostics/image", {
      method: "POST",
      headers,
    }),
  );

beforeEach(() => {
  getCurrentAdmin.mockReset().mockResolvedValue(ADMIN);
});

describe("POST /api/admin/diagnostics/image", () => {
  it("returns 401 when unauthenticated", async () => {
    getCurrentAdmin.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });

  it("returns 403 when called from a different origin", async () => {
    expect((await call({ origin: "https://jahat.example" })).status).toBe(403);
  });

  it("verifies Bun.Image runtime and WebP output for admin", async () => {
    const response = await call();
    expect(response.status).toBe(200);
    const body = (await readBody(response)) as {
      success: boolean;
      data: {
        ok: boolean;
        runtime: string;
        bunVersion: string | null;
        hasBunImage: boolean;
        outputBytes: number;
        durationMs: number;
      };
    };

    expect(body.success).toBe(true);
    expect(body.data.runtime).toBe("bun");
    expect(body.data.hasBunImage).toBe(true);
    expect(body.data.ok).toBe(true);
    expect(typeof body.data.bunVersion).toBe("string");
    expect(body.data.outputBytes).toBeGreaterThan(0);
    expect(body.data.durationMs).toBeGreaterThanOrEqual(0);
  });
});
