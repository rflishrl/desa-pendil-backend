import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteOrphanImages = vi.fn();
const listReferencedImageUrls = vi.fn();

vi.mock("@/lib/storage/blob", () => ({
  deleteOrphanImages: (...args: unknown[]) => deleteOrphanImages(...args),
}));
vi.mock("@/features/uploads/repository", () => ({
  listReferencedImageUrls: (...args: unknown[]) =>
    listReferencedImageUrls(...args),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ kind: "admin" }),
}));
vi.mock("@/lib/supabase/server", () => ({ createPublicClient: () => ({}) }));

const { GET } = await import("@/app/api/cron/cleanup-blobs/route");

const call = (authorization?: string) =>
  GET(
    new Request("http://localhost/api/cron/cleanup-blobs", {
      headers: authorization ? { authorization } : {},
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  listReferencedImageUrls.mockResolvedValue(new Set(["https://dipakai"]));
  deleteOrphanImages.mockResolvedValue({ scanned: 3, deleted: 1 });
});

describe("GET /api/cron/cleanup-blobs", () => {
  it("401 tanpa atau dengan rahasia yang salah", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer salah")).status).toBe(401);
    expect(deleteOrphanImages).not.toHaveBeenCalled();
  });

  it("200 dengan rahasia yang benar, memakai client admin", async () => {
    const response = await call("Bearer cron-secret-untuk-pengujian");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { scanned: 3, deleted: 1 },
    });
    expect(listReferencedImageUrls).toHaveBeenCalledWith({ kind: "admin" });

    const [referenced, olderThan] = deleteOrphanImages.mock.calls[0] as [
      Set<string>,
      Date,
    ];
    expect(referenced.has("https://dipakai")).toBe(true);
    // Hanya foto yang lebih tua dari 24 jam yang boleh dihapus.
    expect(Date.now() - olderThan.getTime()).toBeGreaterThanOrEqual(
      24 * 60 * 60 * 1000 - 1000,
    );
  });
});
