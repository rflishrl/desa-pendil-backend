import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { isLegacyBlobUrl } from "@/lib/storage/media-key";

export const MAX_MIGRATION_DOWNLOAD_BYTES = 25 * 1024 * 1024;
export const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30_000;
export const DEFAULT_MIGRATION_CONCURRENCY = 2;

const BLOB_URL_INLINE_RE = /https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s"'<>)]+/gi;

const TRAILING_PUNCT_RE = /[.,;:!?]+$/;

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface DownloadedBlobAsset {
  bytes: Uint8Array;
  contentType: string;
  sha256: string;
  sizeBytes: number;
  finalUrl: string;
}

/** Loads environment variables from an explicit file or standard local env files. */
export function loadCliEnv(explicitEnvFile?: string): string | null {
  if (explicitEnvFile) {
    const resolved = path.resolve(process.cwd(), explicitEnvFile);
    if (!fs.existsSync(resolved)) {
      throw new Error(`File env tidak ditemukan: ${resolved}`);
    }
    process.loadEnvFile(resolved);
    return resolved;
  }

  for (const candidate of [".env.local", ".env.production.local", ".env"]) {
    const resolved = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(resolved)) {
      process.loadEnvFile(resolved);
      return resolved;
    }
  }
  return null;
}

/** Resolves the Postgres connection string from supported environment variables. */
export function getDatabaseUrlFromEnv(): string {
  const uri = process.env.DATABASE_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!uri) {
    throw new Error("DATABASE_URI, DATABASE_URL, atau POSTGRES_URL belum dikonfigurasi.");
  }
  return uri;
}

/** Masks password credentials inside a PostgreSQL connection string for safe logging. */
export function redactDatabaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = "***";
    }
    return `${parsed.protocol}//${parsed.username ? `${parsed.username}:***@` : ""}${parsed.host}${parsed.pathname}`;
  } catch {
    return "<database-url>";
  }
}

/** Ensures a URL strictly uses HTTPS and points to Vercel Blob public storage. */
export function assertAllowedBlobUrl(rawUrl: string): URL {
  if (!isLegacyBlobUrl(rawUrl)) {
    throw new Error(`URL ditolak karena bukan host Vercel Blob: ${rawUrl}`);
  }
  return new URL(rawUrl);
}

function splitTrailingPunctuation(rawMatch: string): {
  cleanUrl: string;
  suffix: string;
} {
  const punctMatch = TRAILING_PUNCT_RE.exec(rawMatch);
  if (!punctMatch || punctMatch.index <= 0) {
    return { cleanUrl: rawMatch, suffix: "" };
  }
  return {
    cleanUrl: rawMatch.slice(0, punctMatch.index),
    suffix: punctMatch[0],
  };
}

/** Extracts deduplicated Vercel Blob URLs embedded inside HTML, Markdown, or plain text. */
export function extractBlobUrlsFromText(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  BLOB_URL_INLINE_RE.lastIndex = 0;
  for (const match of text.matchAll(BLOB_URL_INLINE_RE)) {
    const { cleanUrl } = splitTrailingPunctuation(match[0]);
    if (isLegacyBlobUrl(cleanUrl)) {
      found.add(cleanUrl);
    }
  }
  return Array.from(found);
}

/** Replaces embedded Vercel Blob URLs in rich text/Markdown using a full-URL map. */
export function replaceBlobUrlsInText(
  text: string,
  replacements: ReadonlyMap<string, string>,
): { nextText: string; replacedCount: number } {
  if (!text || replacements.size === 0) {
    return { nextText: text, replacedCount: 0 };
  }

  let replacedCount = 0;
  BLOB_URL_INLINE_RE.lastIndex = 0;
  const nextText = text.replace(BLOB_URL_INLINE_RE, (fullMatch) => {
    const { cleanUrl, suffix } = splitTrailingPunctuation(fullMatch);
    const replacement = replacements.get(cleanUrl);
    if (!replacement) return fullMatch;
    replacedCount += 1;
    return `${replacement}${suffix}`;
  });

  return { nextText, replacedCount };
}

/** Computes lowercase hex SHA-256 digest of a byte buffer. */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readResponseWithLimit(response: Response, maxBytes: number): Promise<Uint8Array> {
  const headerLength = response.headers.get("content-length");
  if (headerLength !== null) {
    const parsed = Number(headerLength);
    if (Number.isFinite(parsed) && parsed > maxBytes) {
      throw new Error(`Ukuran unduhan (${parsed} bytes) melebihi batas ${maxBytes} bytes.`);
    }
  }

  if (!response.body) {
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength > maxBytes) {
      throw new Error(`Ukuran unduhan (${buf.byteLength} bytes) melebihi batas ${maxBytes} bytes.`);
    }
    return buf;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value || value.byteLength === 0) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Ukuran unduhan melebihi batas ${maxBytes} bytes.`);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

/**
 * Downloads an image from an allowlisted Vercel Blob host with timeout, redirect validation,
 * and streaming size enforcement.
 */
export async function downloadBlobFile(
  rawUrl: string,
  options?: {
    fetchFn?: FetchLike;
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
  },
): Promise<DownloadedBlobAsset> {
  const fetchFn = options?.fetchFn ?? fetch;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;
  const maxBytes = options?.maxBytes ?? MAX_MIGRATION_DOWNLOAD_BYTES;
  const maxRedirects = options?.maxRedirects ?? 3;

  let currentUrl = assertAllowedBlobUrl(rawUrl).toString();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetchFn(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(
          `Redirect tanpa header Location dari ${currentUrl} (status ${response.status}).`,
        );
      }
      if (hop === maxRedirects) {
        throw new Error(`Terlalu banyak redirect saat mengunduh ${rawUrl}.`);
      }
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = assertAllowedBlobUrl(nextUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `Gagal mengunduh ${currentUrl}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const bytes = await readResponseWithLimit(response, maxBytes);
    if (bytes.byteLength === 0) {
      throw new Error(`File kosong dari ${currentUrl}.`);
    }

    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";

    return {
      bytes,
      contentType,
      sha256: sha256Hex(bytes),
      sizeBytes: bytes.byteLength,
      finalUrl: currentUrl,
    };
  }

  throw new Error(`Gagal mengunduh ${rawUrl}.`);
}

/** Probes Content-Length via HEAD on an allowlisted Blob URL (used in dry-run reporting). */
export async function probeBlobContentLength(
  rawUrl: string,
  options?: { fetchFn?: FetchLike; timeoutMs?: number },
): Promise<number | null> {
  const fetchFn = options?.fetchFn ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 10_000;
  try {
    const url = assertAllowedBlobUrl(rawUrl).toString();
    const res = await fetchFn(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const rawLength = res.headers.get("content-length");
    if (!rawLength) return null;
    const parsed = Number(rawLength);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  } catch {
    return null;
  }
}

/** Maps a Blob pathname cleanly into a safe relative path strictly within `filesDir`. */
export function deriveSafeLocalPath(
  filesDir: string,
  urlPathname: string,
  sourceUrl: string,
  usedPaths: Map<string, string>,
): string {
  const cleanedSegments = urlPathname
    .replaceAll("\\", "/")
    .split("/")
    .map((seg) => seg.trim())
    .filter((seg) => seg.length > 0 && seg !== "." && seg !== "..")
    .map((seg) => seg.replace(/[^a-zA-Z0-9._-]/g, "_"));

  const baseRelative =
    cleanedSegments.length > 0
      ? cleanedSegments.join("/")
      : `blob-${sha256Hex(new TextEncoder().encode(sourceUrl)).slice(0, 12)}`;

  let candidate = baseRelative;
  const existingOwner = usedPaths.get(candidate);
  if (existingOwner && existingOwner !== sourceUrl) {
    const hash = sha256Hex(new TextEncoder().encode(sourceUrl)).slice(0, 8);
    const ext = path.posix.extname(candidate);
    const stem = ext ? candidate.slice(0, -ext.length) : candidate;
    candidate = `${stem}-${hash}${ext}`;
  }

  const rootResolved = path.resolve(filesDir);
  const fullResolved = path.resolve(rootResolved, candidate);
  if (fullResolved !== rootResolved && !fullResolved.startsWith(`${rootResolved}${path.sep}`)) {
    throw new Error(`Path keluar dari direktori cadangan: ${candidate}`);
  }

  usedPaths.set(candidate, sourceUrl);
  return candidate;
}

/** Parses bounded concurrency flag (1 or 2) for local Blob/R2 tasks. */
export function parseConcurrencyFlag(rawValue: string): number {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 2) {
    throw new Error(`Nilai --concurrency harus 1 atau 2 (diterima: ${rawValue}).`);
  }
  return parsed;
}

/** Executes async workers with bounded concurrency (`1` or `2`). */
export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const limit = Math.max(1, Math.min(2, Math.floor(concurrency)));
  let cursor = 0;

  async function runLane(): Promise<void> {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      const item = items[index];
      if (item === undefined) return;
      await worker(item, index);
    }
  }

  const laneCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: laneCount }, () => runLane()));
}

/** Formats byte counts compactly for CLI summaries. */
export function formatCliBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
