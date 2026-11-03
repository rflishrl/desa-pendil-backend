import { beforeEach, describe, expect, it, vi } from "vitest";

import { readBody, sameOriginRequest } from "../../../../../test/api";

const signInWithPassword = vi.fn();
const signOut = vi.fn();
const consumeRateLimit = vi.fn();
const resetRateLimit = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSessionClient: async () => ({ auth: { signInWithPassword, signOut } }),
  createPublicClient: () => ({}),
}));
vi.mock("@/lib/api/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/rate-limit")>()),
  consumeRateLimit: (...args: unknown[]) => consumeRateLimit(...args),
  resetRateLimit: (...args: unknown[]) => resetRateLimit(...args),
}));

const { POST } = await import("@/app/api/auth/login/route");
const { AppError } = await import("@/lib/api/errors");

const admin = {
  id: "a1",
  email: "admin@sinarberkah.com",
  app_metadata: { role: "admin" },
};
const loginRequest = (json: unknown, headers?: Record<string, string>) =>
  sameOriginRequest("/api/auth/login", {
    method: "POST",
    json,
    headers: { "x-real-ip": "1.2.3.4", ...headers },
  });

beforeEach(() => {
  signInWithPassword.mockReset();
  signOut.mockReset().mockResolvedValue({ error: null });
  consumeRateLimit.mockReset().mockResolvedValue(undefined);
  resetRateLimit.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/auth/login", () => {
  it("200 untuk admin, penghitung rate limit direset", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: admin },
      error: null,
    });
    const response = await POST(
      loginRequest({ email: admin.email, password: "rahasia" }),
    );
    expect(response.status).toBe(200);
    expect(await readBody(response)).toEqual({
      success: true,
      data: { email: admin.email },
    });
    expect(consumeRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "login" }),
      "1.2.3.4",
      expect.any(String),
    );
    expect(resetRateLimit).toHaveBeenCalledOnce();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("401 untuk password salah, tanpa membocorkan pesan Supabase", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: {
        code: "invalid_credentials",
        message: "Invalid login credentials",
      },
    });
    const response = await POST(
      loginRequest({ email: admin.email, password: "salah" }),
    );
    const text = await response.text();
    expect(response.status).toBe(401);
    expect(text).not.toContain("Invalid login credentials");
    expect(resetRateLimit).not.toHaveBeenCalled();
  });

  it("422 untuk email tidak valid", async () => {
    const response = await POST(loginRequest({ email: "x", password: "y" }));
    expect(response.status).toBe(422);
  });

  it("400 untuk body yang bukan JSON", async () => {
    const request = new Request("http://localhost:4000/api/auth/login", {
      method: "POST",
      headers: { host: "localhost:4000", origin: "http://localhost:4000" },
      body: "bukan json",
    });
    expect((await POST(request)).status).toBe(400);
  });

  it("429 jika rate limit terlampaui, Supabase tidak dipanggil", async () => {
    consumeRateLimit.mockRejectedValue(
      new AppError("RATE_LIMITED", "Terlalu banyak percobaan.", {
        retryAfterSeconds: 60,
      }),
    );
    const response = await POST(
      loginRequest({ email: admin.email, password: "x" }),
    );
    expect(response.status).toBe(429);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("403 jika dipanggil dari situs lain (login CSRF)", async () => {
    const response = await POST(
      loginRequest(
        { email: admin.email, password: "x" },
        { origin: "https://jahat.example" },
      ),
    );
    expect(response.status).toBe(403);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
