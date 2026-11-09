import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteOrphanImages = vi.fn();
const listReferencedImageUrls = vi.fn();

vi.mock("@/lib/storage/blob", () => ({
  deleteOrphanImages: (...args: unknown[]) => deleteOrphanImages(...args),
}));
vi.mock("@/features/uploads/repository", () => ({
  listReferencedImageUrls: (...args: unknown[]) => listReferencedImageUrls(...args),
}));

const { GET } = await import("@/routes/api/cron/cleanup-blobs");

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
  it("returns 401 without authorization header or with invalid secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong-secret")).status).toBe(401);
    expect(deleteOrphanImages).not.toHaveBeenCalled();
  });

  it("returns 200 with valid authorization bearer", async () => {
    const response = await call("Bearer cron-secret-untuk-pengujian");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { scanned: 3, deleted: 1 },
    });
    expect(listReferencedImageUrls).toHaveBeenCalled();

    const [referenced, olderThan] = deleteOrphanImages.mock.calls[0] as [Set<string>, Date];
    expect(referenced.has("https://dipakai")).toBe(true);
    // Only photos older than 24 hours are eligible for deletion.
    expect(Date.now() - olderThan.getTime()).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 1000);
  });
});
