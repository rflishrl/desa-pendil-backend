import { beforeEach, describe, expect, it, vi } from "vitest";

import { readBody, sameOriginRequest } from "../../../../../../test/api";

const getUser = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSessionClient: async () => ({ auth: { getUser } }),
  createPublicClient: () => ({}),
}));

const { POST } = await import("@/app/api/admin/revalidate/test/route");

const ADMIN = {
  id: "a1",
  email: "admin@sinarberkah.com",
  app_metadata: { role: "admin" },
};
const call = (headers?: Record<string, string>) =>
  POST(
    sameOriginRequest("/api/admin/revalidate/test", {
      method: "POST",
      headers,
    }),
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("FRONTEND_URL", "https://plato.example.com");
  vi.stubEnv("REVALIDATE_SECRET", "rahasia-uji-123");
  getUser.mockReset().mockResolvedValue({ data: { user: ADMIN }, error: null });
  fetchMock.mockReset();
});

describe("POST /api/admin/revalidate/test", () => {
  it("401 tanpa login, plato tidak dipanggil", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("x") });
    expect((await call()).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("403 dari situs lain", async () => {
    expect((await call({ origin: "https://jahat.example" })).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("200 untuk admin, dengan hasil uji di dalam data", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ revalidated: ["products"] }), {
        status: 200,
      }),
    );
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await readBody<{ state: string }>(response);
    expect(body).toMatchObject({ success: true, data: { state: "ok" } });
  });
});
