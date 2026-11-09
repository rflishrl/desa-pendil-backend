import { beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.fn();
const del = vi.fn();
vi.mock("@vercel/blob", () => ({
  list: (options: unknown) => list(options),
  del: (urls: unknown) => del(urls),
  put: vi.fn(),
}));

const { deleteOrphanImages } = await import("@/lib/storage/blob");

const HOST = "https://a.public.blob.vercel-storage.com/sinarberkah";
const OLD = new Date("2026-01-01T00:00:00Z");
const NEW = new Date("2026-10-28T23:00:00Z");
const cutoff = new Date("2026-10-28T00:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BLOB_READ_WRITE_TOKEN = "token-uji";
});

describe("deleteOrphanImages", () => {
  it("hanya menghapus foto lama yang tidak dipakai, di semua halaman hasil", async () => {
    list
      .mockResolvedValueOnce({
        blobs: [
          { url: `${HOST}/products/dipakai.jpg`, uploadedAt: OLD },
          { url: `${HOST}/products/yatim.jpg`, uploadedAt: OLD },
        ],
        hasMore: true,
        cursor: "c2",
      })
      .mockResolvedValueOnce({
        blobs: [
          // Masih baru: mungkin form-nya sedang diisi.
          { url: `${HOST}/patterns/baru.jpg`, uploadedAt: NEW },
          { url: `${HOST}/patterns/yatim2.jpg`, uploadedAt: OLD },
        ],
        hasMore: false,
      });

    const result = await deleteOrphanImages(new Set([`${HOST}/products/dipakai.jpg`]), cutoff);

    expect(list).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: "c2" }));
    expect(del).toHaveBeenCalledWith([`${HOST}/products/yatim.jpg`, `${HOST}/patterns/yatim2.jpg`]);
    expect(result).toEqual({ scanned: 4, deleted: 2 });
  });

  it("tidak memanggil del jika tidak ada foto yatim", async () => {
    list.mockResolvedValueOnce({ blobs: [], hasMore: false });
    await expect(deleteOrphanImages(new Set(), cutoff)).resolves.toEqual({
      scanned: 0,
      deleted: 0,
    });
    expect(del).not.toHaveBeenCalled();
  });

  it("menolak jalan tanpa token Blob (UNAVAILABLE)", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await expect(deleteOrphanImages(new Set(), cutoff)).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });
});
