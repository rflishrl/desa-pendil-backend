import { beforeEach, describe, expect, it, vi } from "vitest";

import { readBody, sameOriginRequest } from "../../../../../test/api";

const login = vi.fn();
const consumeRateLimit = vi.fn();
const resetRateLimit = vi.fn();

vi.mock("@/features/auth/service", () => ({
  login: (...args: unknown[]) => login(...args),
}));

vi.mock("@/lib/api/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/rate-limit")>()),
  consumeRateLimit: (...args: unknown[]) => consumeRateLimit(...args),
  resetRateLimit: (...args: unknown[]) => resetRateLimit(...args),
}));

const { POST } = await import("@/app/api/auth/login/route");
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
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/auth/login", () => {
  it("returns 200 for valid admin login and resets rate limit", async () => {
    login.mockResolvedValue({ email: admin.email });
    const response = await POST(
      loginRequest({ email: admin.email, password: "secret-password" }),
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

  it("returns 401 for wrong credentials", async () => {
    login.mockRejectedValue(
      new AppError("UNAUTHENTICATED", "Email atau password salah."),
    );
    const response = await POST(
      loginRequest({ email: admin.email, password: "wrong" }),
    );
    expect(response.status).toBe(401);
    expect(resetRateLimit).not.toHaveBeenCalled();
  });

  it("returns 422 for invalid email", async () => {
    login.mockRejectedValue(
      new AppError("BAD_REQUEST", "Data yang dikirim tidak valid."),
    );
    const response = await POST(loginRequest({ email: "x", password: "y" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for non-JSON body", async () => {
    const request = new Request("http://localhost:4000/api/auth/login", {
      method: "POST",
      headers: { host: "localhost:4000", origin: "http://localhost:4000" },
      body: "not json",
    });
    expect((await POST(request)).status).toBe(400);
  });

  it("returns 429 when rate limit exceeded", async () => {
    consumeRateLimit.mockRejectedValue(
      new AppError("RATE_LIMITED", "Too many requests.", {
        retryAfterSeconds: 60,
      }),
    );
    const response = await POST(
      loginRequest({ email: admin.email, password: "x" }),
    );
    expect(response.status).toBe(429);
    expect(login).not.toHaveBeenCalled();
  });

  it("returns 403 on cross-origin request", async () => {
    const response = await POST(
      loginRequest(
        { email: admin.email, password: "x" },
        { origin: "https://evil.example" },
      ),
    );
    expect(response.status).toBe(403);
    expect(login).not.toHaveBeenCalled();
  });
});
