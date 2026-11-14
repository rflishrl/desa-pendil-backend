import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetServerEnvCache } from "@/lib/env";

const deleteOrphanImages = vi.fn();
const purgeExpiredRateLimits = vi.fn();
const listReferencedImageUrls = vi.fn();
const listOrphanCandidateMediaObjects = vi.fn();
const deleteMediaObjectsByKeys = vi.fn();
const deleteObjects = vi.fn();
const listObjects = vi.fn();

vi.mock("@/lib/api/rate-limit", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/rate-limit")>("@/lib/api/rate-limit");
  return {
    ...actual,
    purgeExpiredRateLimits: (...args: unknown[]) => purgeExpiredRateLimits(...args),
  };
});
vi.mock("@/lib/storage/blob", () => ({
  deleteOrphanImages: (...args: unknown[]) => deleteOrphanImages(...args),
}));
vi.mock("@/lib/storage/provider", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/storage/provider")>("@/lib/storage/provider");
  return {
    ...actual,
    getR2Storage: () => ({
      name: "r2" as const,
      putObject: vi.fn(),
      deleteObjects: (...args: unknown[]) => deleteObjects(...args),
      headObject: vi.fn(),
      listObjects: (...args: unknown[]) => listObjects(...args),
    }),
  };
});
vi.mock("@/features/uploads/repository", async () => {
  const actual = await vi.importActual<typeof import("@/features/uploads/repository")>(
    "@/features/uploads/repository",
  );
  return {
    ...actual,
    listReferencedImageUrls: (...args: unknown[]) => listReferencedImageUrls(...args),
    listOrphanCandidateMediaObjects: (...args: unknown[]) =>
      listOrphanCandidateMediaObjects(...args),
    deleteMediaObjectsByKeys: (...args: unknown[]) => deleteMediaObjectsByKeys(...args),
  };
});

const { GET } = await import("@/routes/api/cron/cleanup-media");

const UUID_ACTIVE = "550e8400-e29b-41d4-a716-446655440010";
const UUID_ORPHAN = "550e8400-e29b-41d4-a716-446655440020";

const call = (authorization?: string) =>
  GET(
    new Request("http://localhost:4000/api/cron/cleanup-media", {
      headers: authorization ? { authorization } : {},
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  resetServerEnvCache();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  purgeExpiredRateLimits.mockResolvedValue(2);
  listReferencedImageUrls.mockResolvedValue(new Set());
  listOrphanCandidateMediaObjects.mockResolvedValue([]);
  deleteMediaObjectsByKeys.mockResolvedValue(0);
  deleteObjects.mockResolvedValue({ deleted: [], failed: [] });
  deleteOrphanImages.mockResolvedValue({ scanned: 0, deleted: 0 });
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvCache();
});

describe("GET /api/cron/cleanup-media", () => {
  it("menolak request tanpa token cron yang valid (401)", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong-secret")).status).toBe(401);
    expect(deleteObjects).not.toHaveBeenCalled();
    expect(deleteOrphanImages).not.toHaveBeenCalled();
  });

  it("menghapus pasangan orphan R2 (full + thumb) dan baris media_objects tanpa memanggil listObjects", async () => {
    vi.stubEnv("STORAGE_PROVIDER", "r2");
    vi.stubEnv("R2_ACCESS_KEY_ID", "k");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "s");
    vi.stubEnv("R2_ENDPOINT", "https://acc.r2.cloudflarestorage.com");
    vi.stubEnv("R2_BUCKET_NAME", "desa-pendil");
    vi.stubEnv("R2_PUBLIC_DOMAIN", "https://media-dp.raflisahrul.my.id");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    resetServerEnvCache();

    listReferencedImageUrls.mockResolvedValue(
      new Set([`https://media-dp.raflisahrul.my.id/dev/${UUID_ACTIVE}.webp`]),
    );
    listOrphanCandidateMediaObjects.mockResolvedValue([
      {
        key: `dev/${UUID_ACTIVE}.webp`,
        folder: "articles",
        sizeBytes: 1000,
        thumbSizeBytes: 200,
        contentType: "image/webp",
        width: 800,
        height: 600,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        key: `dev/${UUID_ORPHAN}.webp`,
        folder: "articles",
        sizeBytes: 1000,
        thumbSizeBytes: 200,
        contentType: "image/webp",
        width: 800,
        height: 600,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    deleteObjects.mockResolvedValue({
      deleted: [`dev/${UUID_ORPHAN}.webp`, `dev/${UUID_ORPHAN}-thumb.webp`],
      failed: [],
    });
    deleteMediaObjectsByKeys.mockResolvedValue(1);

    const response = await call("Bearer cron-secret-untuk-pengujian");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        scanned: 2,
        deleted: 1,
        r2: { scanned: 2, deleted: 1 },
        blob: { scanned: 0, deleted: 0 },
        purgedRateLimits: 2,
      },
    });
    expect(listObjects).not.toHaveBeenCalled();
    expect(deleteObjects).toHaveBeenCalledWith([
      `dev/${UUID_ORPHAN}.webp`,
      `dev/${UUID_ORPHAN}-thumb.webp`,
    ]);
    expect(deleteMediaObjectsByKeys).toHaveBeenCalledWith([`dev/${UUID_ORPHAN}.webp`]);
    expect(deleteOrphanImages).not.toHaveBeenCalled();
  });

  it("tetap membersihkan orphan Blob ketika BLOB_READ_WRITE_TOKEN masih aktif selama transisi", async () => {
    vi.stubEnv("STORAGE_PROVIDER", "blob");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");
    resetServerEnvCache();
    deleteOrphanImages.mockResolvedValue({ scanned: 4, deleted: 2 });

    const response = await call("Bearer cron-secret-untuk-pengujian");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        scanned: 4,
        deleted: 2,
        r2: { scanned: 0, deleted: 0 },
        blob: { scanned: 4, deleted: 2 },
        purgedRateLimits: 2,
      },
    });
    expect(deleteOrphanImages).toHaveBeenCalledOnce();
  });
});
