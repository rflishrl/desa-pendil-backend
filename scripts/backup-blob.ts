import fs from "node:fs";
import path from "node:path";

import { neon } from "@neondatabase/serverless";
import { list } from "@vercel/blob";

import {
  assertAllowedBlobUrl,
  DEFAULT_MIGRATION_CONCURRENCY,
  deriveSafeLocalPath,
  downloadBlobFile,
  extractBlobUrlsFromText,
  type FetchLike,
  formatCliBytes,
  getDatabaseUrlFromEnv,
  loadCliEnv,
  parseConcurrencyFlag,
  runWithConcurrency,
  sha256Hex,
} from "./lib/blob-transfer";

export interface BackupManifestEntry {
  url: string;
  pathname: string;
  localPath: string;
  sizeBytes: number;
  sha256: string;
  contentType: string;
  downloadedAt: string;
  status: "downloaded" | "failed";
  error?: string;
}

export interface BackupManifest {
  version: 1;
  app: string;
  createdAt: string;
  updatedAt: string;
  totalEntries: number;
  downloadedCount: number;
  failedCount: number;
  totalBytes: number;
  entries: BackupManifestEntry[];
}

export interface BackupCliOptions {
  outDir: string;
  prefix: string;
  fromDbOnly: boolean;
  includeDb: boolean;
  dryRun: boolean;
  concurrency: number;
  envFile?: string;
  help: boolean;
}

export interface BlobListEntry {
  url: string;
  pathname: string;
  size: number;
}

export interface BackupDeps {
  listBlobsFn?: (prefix: string) => Promise<BlobListEntry[]>;
  queryDbBlobUrlsFn?: () => Promise<string[]>;
  fetchFn?: FetchLike;
  logger?: (line: string) => void;
}

export interface BackupResult {
  outDir: string;
  manifestPath: string;
  dryRun: boolean;
  totalTargets: number;
  downloaded: number;
  skippedExisting: number;
  failed: number;
  totalBytes: number;
}

const APP_NAME = "desa-pendil-backend";

/** Parses CLI flags for `scripts/backup-blob.ts`. */
export function parseBackupArgs(argv: readonly string[]): BackupCliOptions {
  let outDir = path.join(".backups", "blob-backup");
  let prefix = "";
  let fromDbOnly = false;
  let includeDb = true;
  let dryRun = false;
  let concurrency = DEFAULT_MIGRATION_CONCURRENCY;
  let envFile: string | undefined;
  let help = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--from-db-only") {
      fromDbOnly = true;
    } else if (arg === "--no-db") {
      includeDb = false;
    } else if (arg.startsWith("--out=")) {
      const value = arg.slice("--out=".length).trim();
      if (!value) throw new Error("--out tidak boleh kosong.");
      outDir = value;
    } else if (arg.startsWith("--prefix=")) {
      prefix = arg.slice("--prefix=".length).trim();
    } else if (arg.startsWith("--concurrency=")) {
      concurrency = parseConcurrencyFlag(arg.slice("--concurrency=".length).trim());
    } else if (arg.startsWith("--env-file=")) {
      envFile = arg.slice("--env-file=".length).trim();
    } else {
      throw new Error(`Argumen tidak dikenal: ${arg}`);
    }
  }

  return {
    outDir,
    prefix,
    fromDbOnly,
    includeDb,
    dryRun,
    concurrency,
    envFile,
    help,
  };
}

function printBackupHelp(): void {
  console.log(`Penggunaan: bun run scripts/backup-blob.ts [opsi]

Mengunduh seluruh file Vercel Blob ke folder lokal + membuat manifest.json (SHA-256).

Opsi:
  --out=<dir>          Folder tujuan cadangan (default: .backups/blob-backup)
  --prefix=<prefix>    Filter prefix Blob saat memanggil list()
  --from-db-only       Hanya cadangkan URL Blob yang dirujuk di database Neon
  --no-db              Jangan memindai tabel database (hanya @vercel/blob list)
  --dry-run            Tampilkan rencana cadangan tanpa mengunduh/menulis file
  --concurrency=<1|2>  Konkurensi unduhan (default: 2)
  --env-file=<path>    Muat env dari file tertentu
  -h, --help           Tampilkan bantuan ini`);
}

async function defaultListBlobs(prefix: string): Promise<BlobListEntry[]> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN belum diatur (atau gunakan --from-db-only).");
  }

  const collected: BlobListEntry[] = [];
  let cursor: string | undefined;

  while (true) {
    const page = await list({
      token,
      prefix: prefix || undefined,
      cursor,
      limit: 1000,
    });
    for (const blob of page.blobs) {
      collected.push({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
      });
    }
    if (!page.hasMore || !page.cursor) break;
    cursor = page.cursor;
  }

  return collected;
}

async function defaultQueryDbBlobUrls(): Promise<string[]> {
  const hasDb = Boolean(
    process.env.DATABASE_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL,
  );
  if (!hasDb) return [];

  const sql = neon(getDatabaseUrlFromEnv());
  const [articles, gallery] = await Promise.all([
    sql`SELECT thumbnail_url, content, excerpt FROM articles`,
    sql`SELECT url, caption FROM gallery_images`,
  ]);

  const found = new Set<string>();
  for (const row of articles) {
    for (const field of [row.thumbnail_url, row.content, row.excerpt]) {
      if (typeof field === "string" && field) {
        for (const u of extractBlobUrlsFromText(field)) found.add(u);
      }
    }
  }
  for (const row of gallery) {
    for (const field of [row.url, row.caption]) {
      if (typeof field === "string" && field) {
        for (const u of extractBlobUrlsFromText(field)) found.add(u);
      }
    }
  }
  return Array.from(found);
}

function loadExistingManifest(manifestPath: string): BackupManifest | null {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as BackupManifest;
    if (parsed && parsed.version === 1 && Array.isArray(parsed.entries)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function isVerifiedBackupEntry(
  outDir: string,
  entry: BackupManifestEntry | undefined,
): entry is BackupManifestEntry {
  if (!entry || entry.status !== "downloaded" || !entry.localPath) {
    return false;
  }
  const absPath = path.resolve(outDir, entry.localPath);
  const rootResolved = path.resolve(outDir);
  if (!absPath.startsWith(`${rootResolved}${path.sep}`)) return false;
  if (!fs.existsSync(absPath)) return false;

  try {
    const buf = new Uint8Array(fs.readFileSync(absPath));
    if (buf.byteLength !== entry.sizeBytes) return false;
    return sha256Hex(buf) === entry.sha256;
  } catch {
    return false;
  }
}

function buildManifestSnapshot(
  existingCreatedAt: string | undefined,
  entriesByUrl: Map<string, BackupManifestEntry>,
): BackupManifest {
  const entries = Array.from(entriesByUrl.values()).sort((a, b) => a.url.localeCompare(b.url));
  let downloadedCount = 0;
  let failedCount = 0;
  let totalBytes = 0;

  for (const item of entries) {
    if (item.status === "downloaded") {
      downloadedCount += 1;
      totalBytes += item.sizeBytes;
    } else {
      failedCount += 1;
    }
  }

  const now = new Date().toISOString();
  return {
    version: 1,
    app: APP_NAME,
    createdAt: existingCreatedAt ?? now,
    updatedAt: now,
    totalEntries: entries.length,
    downloadedCount,
    failedCount,
    totalBytes,
    entries,
  };
}

function writeManifestAtomic(manifestPath: string, manifest: BackupManifest): void {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const tempPath = `${manifestPath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, manifestPath);
}

/** Runs idempotent, resumable backup of Vercel Blob files with SHA-256 manifest. */
export async function runBackup(
  options: BackupCliOptions,
  deps?: BackupDeps,
): Promise<BackupResult> {
  const log = deps?.logger ?? console.log;
  const listBlobsFn = deps?.listBlobsFn ?? defaultListBlobs;
  const queryDbBlobUrlsFn = deps?.queryDbBlobUrlsFn ?? defaultQueryDbBlobUrls;
  const resolvedOutDir = path.resolve(process.cwd(), options.outDir);
  const filesDir = path.join(resolvedOutDir, "files");
  const manifestPath = path.join(resolvedOutDir, "manifest.json");

  const targetsByUrl = new Map<string, BlobListEntry>();

  if (!options.fromDbOnly) {
    const blobs = await listBlobsFn(options.prefix);
    for (const blob of blobs) {
      assertAllowedBlobUrl(blob.url);
      targetsByUrl.set(blob.url, blob);
    }
  }

  if (options.includeDb) {
    const dbUrls = await queryDbBlobUrlsFn();
    for (const rawUrl of dbUrls) {
      const parsed = assertAllowedBlobUrl(rawUrl);
      if (!targetsByUrl.has(rawUrl)) {
        targetsByUrl.set(rawUrl, {
          url: rawUrl,
          pathname: parsed.pathname.replace(/^\/+/, ""),
          size: 0,
        });
      }
    }
  }

  const targets = Array.from(targetsByUrl.values()).sort((a, b) => a.url.localeCompare(b.url));

  const existingManifest = loadExistingManifest(manifestPath);
  const entriesByUrl = new Map<string, BackupManifestEntry>();
  const usedPaths = new Map<string, string>();

  if (existingManifest) {
    for (const entry of existingManifest.entries) {
      entriesByUrl.set(entry.url, entry);
      if (entry.localPath.startsWith("files/")) {
        usedPaths.set(entry.localPath.slice("files/".length), entry.url);
      }
    }
  }

  log(
    `[backup] mode=${options.dryRun ? "DRY-RUN" : "EXECUTE"} | targets=${targets.length} | out=${resolvedOutDir}`,
  );

  let downloaded = 0;
  let skippedExisting = 0;
  let failed = 0;

  if (options.dryRun) {
    let estimatedBytes = 0;
    for (const target of targets) {
      estimatedBytes += target.size;
      const existing = entriesByUrl.get(target.url);
      const alreadyVerified = isVerifiedBackupEntry(resolvedOutDir, existing);
      if (alreadyVerified) skippedExisting += 1;
      log(`[dry-run] ${alreadyVerified ? "skip (verified)" : "download"} ${target.url}`);
    }
    return {
      outDir: resolvedOutDir,
      manifestPath,
      dryRun: true,
      totalTargets: targets.length,
      downloaded: 0,
      skippedExisting,
      failed: 0,
      totalBytes: estimatedBytes,
    };
  }

  fs.mkdirSync(filesDir, { recursive: true });

  await runWithConcurrency(targets, options.concurrency, async (target) => {
    const existing = entriesByUrl.get(target.url);
    if (isVerifiedBackupEntry(resolvedOutDir, existing)) {
      skippedExisting += 1;
      log(`[skip] ${target.pathname} (sudah terverifikasi)`);
      return;
    }

    const relFilePath = deriveSafeLocalPath(
      filesDir,
      target.pathname || new URL(target.url).pathname,
      target.url,
      usedPaths,
    );
    const localPath = path.posix.join("files", relFilePath);
    const absTarget = path.resolve(filesDir, relFilePath);

    try {
      const asset = await downloadBlobFile(target.url, {
        fetchFn: deps?.fetchFn,
      });
      fs.mkdirSync(path.dirname(absTarget), { recursive: true });
      fs.writeFileSync(absTarget, asset.bytes);

      entriesByUrl.set(target.url, {
        url: target.url,
        pathname: target.pathname,
        localPath,
        sizeBytes: asset.sizeBytes,
        sha256: asset.sha256,
        contentType: asset.contentType,
        downloadedAt: new Date().toISOString(),
        status: "downloaded",
      });
      downloaded += 1;
      log(
        `[ok] ${localPath} | ${formatCliBytes(asset.sizeBytes)} | sha256=${asset.sha256.slice(0, 12)}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      entriesByUrl.set(target.url, {
        url: target.url,
        pathname: target.pathname,
        localPath,
        sizeBytes: 0,
        sha256: "",
        contentType: "",
        downloadedAt: new Date().toISOString(),
        status: "failed",
        error: message,
      });
      failed += 1;
      log(`[fail] ${target.url}: ${message}`);
    }
  });

  const manifest = buildManifestSnapshot(existingManifest?.createdAt, entriesByUrl);
  writeManifestAtomic(manifestPath, manifest);

  log(
    `[summary] total=${targets.length} | downloaded=${downloaded} | skipped=${skippedExisting} | failed=${failed} | totalBytes=${formatCliBytes(manifest.totalBytes)} | manifest=${manifestPath}`,
  );

  return {
    outDir: resolvedOutDir,
    manifestPath,
    dryRun: false,
    totalTargets: targets.length,
    downloaded,
    skippedExisting,
    failed,
    totalBytes: manifest.totalBytes,
  };
}

if (import.meta.main) {
  try {
    const options = parseBackupArgs(process.argv.slice(2));
    if (options.help) {
      printBackupHelp();
      process.exit(0);
    }
    const envLoaded = loadCliEnv(options.envFile);
    if (envLoaded) {
      console.log(`[env] Memuat konfigurasi dari ${envLoaded}`);
    }
    const result = await runBackup(options);
    if (result.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`[backup:error] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
