import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { ApiError } from "@/lib/http";
import { getEnv } from "@/lib/env";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Vercel request body cap is 4.5 MB

type Kind = { ext: "jpg" | "png" | "webp"; contentType: string };

/** Detect the real type from magic bytes; never trust the client's filename or MIME. */
export function sniffImage(bytes: Uint8Array): Kind | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(0xff, 0xd8, 0xff)) return { ext: "jpg", contentType: "image/jpeg" };
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { ext: "png", contentType: "image/png" };
  const isRiff = starts(0x52, 0x49, 0x46, 0x46);
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (isRiff && isWebp) return { ext: "webp", contentType: "image/webp" };
  return null;
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function localRoot(): string {
  return path.resolve(getEnv().UPLOAD_DIR);
}

/** Validates and stores an uploaded image; returns its public URL. */
export async function saveImage(file: File, folder: "articles" | "gallery"): Promise<string> {
  if (file.size === 0) throw new ApiError(422, "File kosong");
  if (file.size > MAX_IMAGE_BYTES) throw new ApiError(413, "Ukuran gambar maksimal 4 MB");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) throw new ApiError(415, "Format gambar harus JPG, PNG, atau WebP");

  const key = `${folder}/${randomUUID()}.${kind.ext}`;
  const token = getEnv().BLOB_READ_WRITE_TOKEN;

  if (token) {
    const blob = await put(key, Buffer.from(bytes), {
      access: "public",
      contentType: kind.contentType,
      addRandomSuffix: false,
      token,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new ApiError(500, "BLOB_READ_WRITE_TOKEN belum diatur; upload tidak tersedia di Vercel");
  }

  const target = path.join(localRoot(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return `/uploads/${key}`;
}

/** Best-effort removal of a stored image. Never throws: a leftover file must not block edits. */
export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith("/uploads/")) {
      const target = resolveLocalPath(url.slice("/uploads/".length));
      if (target) await unlink(target);
    } else if (url.includes(".public.blob.vercel-storage.com")) {
      await del(url, { token: getEnv().BLOB_READ_WRITE_TOKEN });
    }
  } catch (error) {
    console.warn("[storage] could not delete", url, error);
  }
}

/** Maps a URL sub-path to a file inside UPLOAD_DIR, or null if it escapes it. */
export function resolveLocalPath(relative: string): string | null {
  const root = localRoot();
  const target = path.resolve(root, relative);
  return target.startsWith(root + path.sep) ? target : null;
}

export async function readLocalImage(relative: string) {
  const target = resolveLocalPath(relative);
  if (!target) return null;
  const ext = path.extname(target).slice(1).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return null;
  try {
    return { body: await readFile(target), contentType };
  } catch {
    return null;
  }
}

/** Turn "/uploads/x.jpg" into an absolute URL the public frontend can load. */
export function absoluteUrl(url: string | null): string | null {
  if (!url) return null;
  const base = getEnv().PUBLIC_BASE_URL?.replace(/\/$/, "");
  return url.startsWith("/") && base ? `${base}${url}` : url;
}
