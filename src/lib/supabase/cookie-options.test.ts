import { createServerClient } from "@supabase/ssr";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SESSION_COOKIE_OPTIONS,
  SESSION_MAX_AGE_SECONDS,
  withSessionLifetime,
} from "@/lib/supabase/cookie-options";

type Written = { name: string; value: string; options: Record<string, unknown> };

const user = {
  id: "00000000-0000-0000-0000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "admin@example.com",
  app_metadata: { role: "admin" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SESSION_COOKIE_OPTIONS", () => {
  it("hides the cookie from scripts and blocks cross-site POSTs", () => {
    expect(SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(SESSION_COOKIE_OPTIONS.sameSite).toBe("lax");
    expect(SESSION_COOKIE_OPTIONS.path).toBe("/");
  });
});

describe("withSessionLifetime", () => {
  it("shortens a long cookie to 7 days", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(604_800);
    const out = withSessionLifetime({ httpOnly: true, maxAge: 34_560_000 });
    expect(out.maxAge).toBe(604_800);
    expect(out.httpOnly).toBe(true);
  });

  it("leaves a cookie that is being deleted alone", () => {
    expect(withSessionLifetime({ maxAge: 0 }).maxAge).toBe(0);
  });
});

describe("the real Supabase client with these options", () => {
  function makeClient(written: Written[]) {
    return createServerClient("https://example.supabase.co", "sb_publishable_test", {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll: () => [],
        setAll: (list) => {
          for (const c of list) {
            written.push({
              name: c.name,
              value: c.value,
              options: withSessionLifetime(c.options) as Record<string, unknown>,
            });
          }
        },
      },
    });
  }

  it("writes the session cookie as httpOnly with a 7-day lifetime", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          access_token: "header.payload.signature",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "refresh-abc",
          user,
        }),
      ),
    );

    const written: Written[] = [];
    const { error } = await makeClient(written).auth.signInWithPassword({
      email: "admin@example.com",
      password: "not-a-real-password",
    });

    expect(error).toBeNull();
    const session = written.filter((c) => c.value !== "" && c.name.startsWith("sb-"));
    expect(session.length).toBeGreaterThan(0);
    for (const cookie of session) {
      expect(cookie.options.httpOnly).toBe(true);
      expect(cookie.options.sameSite).toBe("lax");
      expect(cookie.options.maxAge).toBe(SESSION_MAX_AGE_SECONDS);
    }
  });
});
