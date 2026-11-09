import { beforeEach, describe, expect, it, vi } from "vitest";

import { readBody, sameOriginRequest } from "../../../../test/api";

const login = vi.fn();
const consumeRateLimit = vi.fn();
const resetRateLimit = vi.fn();
const verifyTurnstile = vi.fn();

vi.mock("@/features/auth/service", () => ({
  login: (...args: unknown[]) => login(...args),
}));

vi.mock("@/server/turnstile", () => ({
  verifyTurnstile: (...args: unknown[]) => verifyTurnstile(...args),
}));

vi.mock("@/lib/api/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/rate-limit")>()),
  consumeRateLimit: (...args: unknown[]) => consumeRateLimit(...args),
  resetRateLimit: (...args: unknown[]) => resetRateLimit(...args),
}));

const { POST } = await import("@/routes/api/auth/login");
const { AppError } = await import("@/lib/api/errors");

const admin = {
  email: "admin@desa-pendil.id",
};

const loginRequest = (json: unknown, headers?: Record<string, string>) =>
  sameOriginRequest("/api/auth/login", {
    method: "POST",
    json,
    headers: { "x-real-ip": "1.2.3.4", ...headers },
  });

beforeEach(() => {
  login.mockReset();
  consumeRateLimit.mockReset().mockResolvedValue(undefined);
  resetRateLimit.mockReset().mockResolvedValue(undefined);
  verifyTurnstile.mockReset().mockResolvedValue({ success: true });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/auth/login", () => {
  it("returns 200 for valid admin login and resets rate limit", async () => {
    login.mockResolvedValue({ email: admin.email });
    const response = await POST(
      loginRequest({
        email: admin.email,
        password: "secret-password",
        turnstileToken: "valid-token",
      }),
    );
    expect(response.status).toBe(200);
    expect(await readBody(response)).toEqual({
      success: true,
      data: { email: admin.email },
    });
    expect(verifyTurnstile).toHaveBeenCalledWith({
      token: "valid-token",
      expectedAction: "login",
      clientIp: "1.2.3.4",
    });
    expect(consumeRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 8 }),
      "1.2.3.4",
      expect.any(String),
    );
    expect(resetRateLimit).toHaveBeenCalledWith(expect.objectContaining({ limit: 8 }), "1.2.3.4");
  });

  it("rejects when Turnstile verification fails with 422", async () => {
    verifyTurnstile.mockResolvedValue({ success: false, error: "Verifikasi gagal." });
    const response = await POST(
      loginRequest({
        email: admin.email,
        password: "secret-password",
        turnstileToken: "invalid-token",
      }),
    );
    expect(response.status).toBe(422);
    expect(await readBody(response)).toEqual({
      success: false,
      error: "Verifikasi gagal.",
    });
    expect(login).not.toHaveBeenCalled();
    expect(resetRateLimit).not.toHaveBeenCalled();
  });

  it("propagates authentication errors from service when Turnstile passes", async () => {
    login.mockRejectedValue(new AppError("UNAUTHENTICATED", "Email atau password salah."));
    const response = await POST(
      loginRequest({
        email: admin.email,
        password: "wrong-password",
        turnstileToken: "valid-token",
      }),
    );
    expect(response.status).toBe(401);
    expect(await readBody(response)).toEqual({
      success: false,
      error: "Email atau password salah.",
    });
    expect(resetRateLimit).not.toHaveBeenCalled();
  });

  it("rejects non-json bodies", async () => {
    const request = sameOriginRequest("/api/auth/login", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "text/plain" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await readBody(response)).toEqual({
      success: false,
      error: "Body must be valid JSON.",
    });
  });

  it("handles rate limiting properly before login processing", async () => {
    consumeRateLimit.mockRejectedValue(
      new AppError("RATE_LIMITED", "Terlalu banyak permintaan login.", {
        retryAfterSeconds: 600,
      }),
    );
    const response = await POST(
      loginRequest({
        email: admin.email,
        password: "secret-password",
        turnstileToken: "valid-token",
      }),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("600");
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
  });
});
