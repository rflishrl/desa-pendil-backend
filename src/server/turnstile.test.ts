import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { _resetSeenTokensForTesting, verifyTurnstile } from "@/server/turnstile";

describe("verifyTurnstile (Server-side Cloudflare Turnstile Verification)", () => {
  beforeEach(() => {
    _resetSeenTokensForTesting();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails closed when token is empty or whitespace", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(verifyTurnstile({ token: "" })).resolves.toEqual({
      success: false,
      error: "Verifikasi gagal.",
    });

    await expect(verifyTurnstile({ token: "   " })).resolves.toEqual({
      success: false,
      error: "Verifikasi gagal.",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("succeeds when Cloudflare siteverify responds with success and matching action/hostname", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: "login",
          hostname: "localhost",
          challenge_ts: "2026-11-10T00:00:00.000Z",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await verifyTurnstile({
      token: "valid-token-123",
      expectedAction: "login",
      clientIp: "1.2.3.4",
    });

    expect(result).toEqual({ success: true });
  });

  it("fails closed when Cloudflare siteverify returns success: false", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          "error-codes": ["invalid-input-response"],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await verifyTurnstile({
      token: "invalid-token",
      expectedAction: "login",
    });

    expect(result).toEqual({
      success: false,
      error: "Verifikasi gagal.",
    });
  });

  it("fails closed when action does not match expectedAction", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: "register",
          hostname: "localhost",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await verifyTurnstile({
      token: "valid-token-wrong-action",
      expectedAction: "login",
    });

    expect(result).toEqual({
      success: false,
      error: "Verifikasi gagal.",
    });
  });

  it("fails closed when hostname is not in allowed list", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: "login",
          hostname: "evil-phishing-domain.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await verifyTurnstile({
      token: "valid-token-evil-host",
      expectedAction: "login",
    });

    expect(result).toEqual({
      success: false,
      error: "Verifikasi gagal.",
    });
  });

  it("fails closed when fetch throws an error or times out", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network timeout after 5000ms"));

    const result = await verifyTurnstile({
      token: "token-causing-timeout",
      expectedAction: "login",
    });

    expect(result).toEqual({
      success: false,
      error: "Verifikasi gagal.",
    });
  });

  it("fails closed when siteverify endpoint returns HTTP 500 error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Internal Server Error", { status: 500 }),
    );

    const result = await verifyTurnstile({
      token: "token-server-error",
      expectedAction: "login",
    });

    expect(result).toEqual({
      success: false,
      error: "Verifikasi gagal.",
    });
  });

  it("rejects token reuse (single-use defense)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: "login",
          hostname: "localhost",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const first = await verifyTurnstile({
      token: "single-use-token-abc",
      expectedAction: "login",
    });
    expect(first).toEqual({ success: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second attempt with identical token is rejected immediately without second fetch
    const second = await verifyTurnstile({
      token: "single-use-token-abc",
      expectedAction: "login",
    });
    expect(second).toEqual({
      success: false,
      error: "Verifikasi gagal.",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
