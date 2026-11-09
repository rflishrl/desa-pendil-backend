import { describe, expect, it } from "vitest";

import { articleCreateSchema, articleUpdateSchema } from "@/features/articles/schemas";
import { galleryCreateSchema, galleryUpdateSchema } from "@/features/gallery/schemas";
import { listQuerySchema } from "@/lib/schemas/common";

const BLOB_URL = "https://abc123.public.blob.vercel-storage.com/desa-pendil/articles/photo-x.jpg";

describe("articleCreateSchema", () => {
  it("mengisi nilai bawaan untuk kolom opsional", () => {
    expect(articleCreateSchema.parse({ title: "Panen Raya", content: "Isi berita" })).toEqual({
      title: "Panen Raya",
      content: "Isi berita",
      type: "berita",
      excerpt: "",
      thumbnail_url: "",
      author: "Admin",
      status: "draft",
    });
  });

  it("menerima gambar dari Vercel Blob", () => {
    const result = articleCreateSchema.parse({
      title: "Panen Raya",
      content: "Isi",
      thumbnail_url: BLOB_URL,
    });
    expect(result.thumbnail_url).toBe(BLOB_URL);
  });

  it.each([
    "https://example.com/foto.jpg",
    "http://abc123.public.blob.vercel-storage.com/foto.jpg",
    "https://public.blob.vercel-storage.com.evil.com/foto.jpg",
    "javascript:alert(1)",
  ])("menolak gambar di luar Vercel Blob: %s", (thumbnail_url) => {
    expect(
      articleCreateSchema.safeParse({
        title: "Panen Raya",
        content: "Isi",
        thumbnail_url,
      }).success,
    ).toBe(false);
  });

  it("menolak isi kosong, jenis dan status yang tidak dikenal", () => {
    const base = { title: "Panen Raya", content: "Isi" };
    expect(articleCreateSchema.safeParse({ ...base, content: " " }).success).toBe(false);
    expect(articleCreateSchema.safeParse({ ...base, type: "iklan" }).success).toBe(false);
    expect(articleCreateSchema.safeParse({ ...base, status: "scheduled" }).success).toBe(false);
  });
});

describe("articleUpdateSchema", () => {
  it("tanpa nilai bawaan, jadi kolom yang tidak dikirim tidak tertimpa", () => {
    expect(articleUpdateSchema.parse({ title: "Judul baru" })).toEqual({
      title: "Judul baru",
    });
  });
});

describe("galleryCreateSchema", () => {
  it("mewajibkan foto", () => {
    expect(galleryCreateSchema.safeParse({ alt: "Balai desa" }).success).toBe(false);
  });

  it("menerima data lengkap, memangkas spasi, dan mengisi urutan 0", () => {
    const result = galleryCreateSchema.parse({
      url: BLOB_URL,
      alt: "  Balai desa ",
    });
    expect(result.alt).toBe("Balai desa");
    expect(result.caption).toBe("");
    expect(result.sort_order).toBe(0);
  });

  it("urutan kosong dianggap 0, pecahan ditolak", () => {
    const base = { url: BLOB_URL, alt: "Balai desa" };
    expect(galleryCreateSchema.parse({ ...base, sort_order: "" }).sort_order).toBe(0);
    expect(galleryCreateSchema.safeParse({ ...base, sort_order: 1.5 }).success).toBe(false);
  });

  it("versi ubah boleh tanpa foto", () => {
    expect(galleryUpdateSchema.parse({ alt: "Teks baru" })).toEqual({
      alt: "Teks baru",
    });
  });
});

describe("listQuerySchema", () => {
  const schema = listQuerySchema(50);

  it("nilai bawaan jika tidak ada parameter", () => {
    expect(schema.parse({})).toEqual({ q: undefined, page: 1, limit: 50 });
  });

  it("nilai tidak masuk akal diganti nilai bawaan, bukan ditolak", () => {
    expect(schema.parse({ page: "-3", limit: "99999", q: "  panen " })).toEqual({
      q: "panen",
      page: 1,
      limit: 50,
    });
  });
});
