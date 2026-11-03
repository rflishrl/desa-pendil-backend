import "server-only";

import { del, list, put } from "@vercel/blob";

import { AppError } from "@/lib/api/errors";
import { log } from "@/lib/log";

/** Semua foto unggahan disimpan di bawah awalan ini. */
export const UPLOAD_PREFIX = "desa-pendil/";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel membatasi body fungsi sekitar 4,5 MB.

const SIGNATURES: Record<
  string,
  { extension: string; test: (b: Uint8Array) => boolean }
> = {
  "image/jpeg": {
    extension: "jpg",
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  "image/webp": {
    extension: "webp",
    // "RIFF....WEBP"
    test: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
};

export const MAX_UPLOAD_MB = MAX_BYTES / (1024 * 1024);

function requireToken(): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new AppError(
      "UNAVAILABLE",
      "Penyimpanan foto belum dikonfigurasi (BLOB_READ_WRITE_TOKEN).",
    );
  }
}

/** Memvalidasi file gambar (tipe, ukuran, dan isi file) lalu menyimpannya ke Vercel Blob. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  requireToken();

  const rule = SIGNATURES[file.type];
  if (!rule) {
    throw new AppError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Format foto harus JPG, PNG, atau WebP.",
    );
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new AppError(
      "PAYLOAD_TOO_LARGE",
      `Ukuran foto maksimal ${MAX_UPLOAD_MB} MB.`,
    );
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!rule.test(header)) {
    throw new AppError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Isi file tidak cocok dengan format fotonya.",
    );
  }

  const blob = await put(`${folder}/photo.${rule.extension}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });
  return blob.url;
}

function isBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Menghapus foto lama dari Blob. Gagal menghapus tidak membatalkan operasi utama. */
export async function deleteImage(url: string | undefined): Promise<void> {
  if (!url || !isBlobUrl(url) || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(url);
  } catch (error) {
    log("error", "gagal menghapus foto lama", { url, error });
  }
}

/**
 * Menghapus foto yatim: foto di bawah `UPLOAD_PREFIX` yang tidak dipakai data mana pun
 * dan diunggah sebelum `olderThan`. Foto yatim muncul saat admin mengunggah foto lalu
 * membatalkan form, atau mengganti foto beberapa kali sebelum menyimpan.
 */
export async function deleteOrphanImages(
  referenced: ReadonlySet<string>,
  olderThan: Date,
): Promise<{ scanned: number; deleted: number }> {
  requireToken();

  const orphans: string[] = [];
  let scanned = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: UPLOAD_PREFIX, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      scanned += 1;
      if (blob.uploadedAt < olderThan && !referenced.has(blob.url)) {
        orphans.push(blob.url);
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  for (let i = 0; i < orphans.length; i += 100) {
    await del(orphans.slice(i, i + 100));
  }
  return { scanned, deleted: orphans.length };
}
