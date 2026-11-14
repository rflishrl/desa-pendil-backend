import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfigError, getServerEnv, isNonProductionMediaEnv, resetServerEnvCache } from "@/lib/env";

beforeEach(() => {
  resetServerEnvCache();
  vi.unstubAllEnvs();
});

afterEach(() => {
  resetServerEnvCache();
  vi.unstubAllEnvs();
});

describe("getServerEnv (R2 & storage config)", () => {
  it("defaults to STORAGE_PROVIDER=blob without requiring R2 variables", () => {
    const env = getServerEnv();
    expect(env.STORAGE_PROVIDER).toBe("blob");
    expect(env.R2_APP_QUOTA_MB).toBe(2560);
    expect(env.MAX_UPLOAD_MB).toBe(4);
  });

  it("fails fast with ConfigError when STORAGE_PROVIDER=r2 is missing credentials", () => {
    vi.stubEnv("STORAGE_PROVIDER", "r2");
    expect(() => getServerEnv()).toThrow(ConfigError);
  });

  it("validates and normalizes trailing slashes when STORAGE_PROVIDER=r2", () => {
    vi.stubEnv("STORAGE_PROVIDER", "r2");
    vi.stubEnv("R2_ACCESS_KEY_ID", "key-id");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret-key");
    vi.stubEnv("R2_ENDPOINT", "https://acct.r2.cloudflarestorage.com/");
    vi.stubEnv("R2_BUCKET_NAME", "desa-pendil");
    vi.stubEnv("R2_PUBLIC_DOMAIN", "https://media-dp.raflisahrul.my.id/");
    vi.stubEnv("R2_APP_QUOTA_MB", "2560");
    vi.stubEnv("MAX_UPLOAD_MB", "4");

    const env = getServerEnv();
    expect(env.STORAGE_PROVIDER).toBe("r2");
    expect(env.R2_ENDPOINT).toBe("https://acct.r2.cloudflarestorage.com");
    expect(env.R2_PUBLIC_DOMAIN).toBe("https://media-dp.raflisahrul.my.id");
    expect(env.R2_BUCKET_NAME).toBe("desa-pendil");
  });

  it("rejects non-https R2 URLs and MAX_UPLOAD_MB above 4", () => {
    vi.stubEnv("STORAGE_PROVIDER", "r2");
    vi.stubEnv("R2_ACCESS_KEY_ID", "key-id");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret-key");
    vi.stubEnv("R2_ENDPOINT", "http://acct.r2.cloudflarestorage.com");
    vi.stubEnv("R2_BUCKET_NAME", "desa-pendil");
    vi.stubEnv("R2_PUBLIC_DOMAIN", "https://media-dp.raflisahrul.my.id");
    expect(() => getServerEnv()).toThrow(ConfigError);

    resetServerEnvCache();
    vi.stubEnv("STORAGE_PROVIDER", "blob");
    vi.stubEnv("MAX_UPLOAD_MB", "5");
    expect(() => getServerEnv()).toThrow(ConfigError);
  });
});

describe("isNonProductionMediaEnv", () => {
  it("uses VERCEL_ENV when present and falls back to NODE_ENV locally", () => {
    expect(isNonProductionMediaEnv({ VERCEL_ENV: "production" })).toBe(false);
    expect(
      isNonProductionMediaEnv({
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
      }),
    ).toBe(true);
    expect(
      isNonProductionMediaEnv({
        VERCEL_ENV: "development",
        NODE_ENV: "production",
      }),
    ).toBe(true);
    expect(isNonProductionMediaEnv({ NODE_ENV: "production" })).toBe(false);
    expect(isNonProductionMediaEnv({ NODE_ENV: "development" })).toBe(true);
  });
});
