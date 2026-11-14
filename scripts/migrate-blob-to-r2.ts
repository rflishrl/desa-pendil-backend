import fs from "node:fs";
import path from "node:path";

import { neon } from "@neondatabase/serverless";

import { processImagePipeline } from "@/features/uploads/image-pipeline";
import { isLegacyBlobUrl } from "@/lib/storage/media-key";
import {
  deriveThumbKey,
  generateMediaKey,
  getPublicMediaUrl,
  IMMUTABLE_CACHE_CONTROL,
} from "@/lib/storage/media-url";
import { createR2Provider } from "@/lib/storage/r2";
import type { StorageProvider } from "@/lib/storage/types";

import type { BackupManifest } from "./backup-blob";
import {
  assertAllowedBlobUrl,
  DEFAULT_MIGRATION_CONCURRENCY,
  downloadBlobFile,
  extractBlobUrlsFromText,
  type FetchLike,
  formatCliBytes,
  getDatabaseUrlFromEnv,
  loadCliEnv,
  parseConcurrencyFlag,
  probeBlobContentLength,
  redactDatabaseUrl,
  replaceBlobUrlsInText,
  runWithConcurrency,
  sha256Hex,
} from "./lib/blob-transfer";

export type MigrationTargetEnv = "dev" | "production";

export interface MigrateCliOptions {
  dryRun: boolean;
  target: MigrationTargetEnv;
  concurrency: number;
  stateFile: string;
  backupDir?: string;
  limit?: number;
  envFile?: string;
  help: boolean;
}

export interface ScannedRowTextField {
  column: "content" | "excerpt" | "caption";
  value: string;
}

export interface ScannedMediaRow {
  table: "articles" | "gallery_images";
  id: string;
  folder: string;
  imageColumnName: "thumbnail_url" | "url";
  imageColumnValue: string;
  textFields: ScannedRowTextField[];
}

export interface InsertMediaRecordInput {
  key: string;
  folder: string;
  sizeBytes: number;
  thumbSizeBytes: number;
  contentType: string;
  width: number;
  height: number;
}

export interface MigrationDbAdapter {
  scanRows: () => Promise<ScannedMediaRow[]>;
  getUsedMediaBytes: () => Promise<number>;
  insertMediaObject: (input: InsertMediaRecordInput) => Promise<void>;
  updateRow: (
    table: ScannedMediaRow["table"],
    id: string,
    updates: {
      thumbnail_url?: string;
      url?: string;
      content?: string;
      excerpt?: string;
      caption?: string;
    },
  ) => Promise<void>;
}

export interface MigratedUrlMapping {
  blobUrl: string;
  key: string;
  thumbKey: string;
  publicUrl: string;
  originalSize: number;
  fullSize: number;
  thumbSize: number;
  totalCompressedSize: number;
  width: number;
  height: number;
  migratedAt: string;
}

export interface MigrationStateFile {
  version: 1;
  app: "desa-pendil-backend";
  target: MigrationTargetEnv;
  urlMappings: Record<string, MigratedUrlMapping>;
}

export interface MigrationReport {
  dryRun: boolean;
  target: MigrationTargetEnv;
  concurrency: number;
  scannedRows: number;
  uniqueBlobUrls: number;
  plannedOrMigrated: number;
  reusedFromState: number;
  failed: number;
  updatedRows: number;
  dedicatedColumnRewrites: number;
  richTextUrlRewrites: number;
  totalOriginalBytes: number;
  totalFullBytes: number;
  totalThumbBytes: number;
  totalCompressedBytes: number;
  savedPercent: number;
  errors: Array<{ blobUrl: string; message: string }>;
}

export interface MigrationDeps {
  db?: MigrationDbAdapter;
  storage?: StorageProvider;
  r2PublicDomain?: string;
  quotaMb?: number;
  fetchFn?: FetchLike;
  processImage?: typeof processImagePipeline;
  generateKeyFn?: (nonProd: boolean) => string;
  logger?: (line: string) => void;
}

/** Parses CLI flags for `scripts/migrate-blob-to-r2.ts` (defaults to `--dry-run`). */
export function parseMigrateArgs(argv: readonly string[]): MigrateCliOptions {
  let dryRunFlag = false;
  let executeFlag = false;
  let target: MigrationTargetEnv = "dev";
  let concurrency = DEFAULT_MIGRATION_CONCURRENCY;
  let explicitStateFile: string | undefined;
  let backupDir: string | undefined;
  let limit: number | undefined;
  let envFile: string | undefined;
  let help = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--dry-run") {
      dryRunFlag = true;
    } else if (arg === "--execute" || arg === "--apply") {
      executeFlag = true;
    } else if (arg.startsWith("--target=")) {
      const value = arg.slice("--target=".length).trim();
      if (value !== "dev" && value !== "production") {
        throw new Error(`--target harus bernilai "dev" atau "production" (diterima: ${value}).`);
      }
      target = value;
    } else if (arg.startsWith("--concurrency=")) {
      concurrency = parseConcurrencyFlag(arg.slice("--concurrency=".length).trim());
    } else if (arg.startsWith("--state-file=")) {
      const value = arg.slice("--state-file=".length).trim();
      if (!value) throw new Error("--state-file tidak boleh kosong.");
      explicitStateFile = value;
    } else if (arg.startsWith("--backup-dir=")) {
      const value = arg.slice("--backup-dir=".length).trim();
      if (!value) throw new Error("--backup-dir tidak boleh kosong.");
      backupDir = value;
    } else if (arg.startsWith("--limit=")) {
      const raw = arg.slice("--limit=".length).trim();
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`--limit harus bilangan bulat positif: ${raw}`);
      }
      limit = parsed;
    } else if (arg.startsWith("--env-file=")) {
      envFile = arg.slice("--env-file=".length).trim();
    } else {
      throw new Error(`Argumen tidak dikenal: ${arg}`);
    }
  }

  if (dryRunFlag && executeFlag) {
    throw new Error("Tidak dapat menggabungkan --dry-run dengan --execute / --apply.");
  }

  return {
    dryRun: !executeFlag,
    target,
    concurrency,
    stateFile: explicitStateFile ?? path.join(".backups", `migrate-state-${target}.json`),
    backupDir,
    limit,
    envFile,
    help,
  };
}

function printMigrateHelp(): void {
  console.log(`Penggunaan: bun run scripts/migrate-blob-to-r2.ts [opsi]

Memigrasikan gambar dari Vercel Blob ke Cloudflare R2 (dual WebP via Bun.Image) dan
memperbarui kolom gambar menjadi key canonical serta URL inline artikel/caption menjadi URL R2 publik.

Opsi:
  --dry-run                Mode simulasi tanpa unggah ke R2 atau ubah DB (DEFAULT)
  --execute, --apply       Jalankan migrasi nyata ke R2 dan database
  --target=<dev|production> Target prefix key: dev -> dev/<uuid>.webp (DEFAULT), production -> <uuid>.webp
  --concurrency=<1|2>      Jumlah proses paralel per batch (default: 2)
  --state-file=<path>      File checkpoint untuk resume idempoten
  --backup-dir=<dir>       Baca file asli terverifikasi dari cadangan backup-blob.ts bila ada
  --limit=<n>              Batasi jumlah URL Blob unik yang diproses dalam satu eksekusi
  --env-file=<path>        Muat env dari file tertentu
  -h, --help               Tampilkan bantuan ini`);
}

function createNeonMigrationDb(databaseUrl: string): MigrationDbAdapter {
  const sql = neon(databaseUrl);

  return {
    async scanRows() {
      const [articles, gallery] = await Promise.all([
        sql`SELECT id, thumbnail_url, content, excerpt FROM articles ORDER BY created_at ASC`,
        sql`SELECT id, url, caption FROM gallery_images ORDER BY created_at ASC`,
      ]);

      const rows: ScannedMediaRow[] = [];
      for (const row of articles) {
        rows.push({
          table: "articles",
          id: String(row.id),
          folder: "articles",
          imageColumnName: "thumbnail_url",
          imageColumnValue: typeof row.thumbnail_url === "string" ? row.thumbnail_url : "",
          textFields: [
            {
              column: "content",
              value: typeof row.content === "string" ? row.content : "",
            },
            {
              column: "excerpt",
              value: typeof row.excerpt === "string" ? row.excerpt : "",
            },
          ],
        });
      }
      for (const row of gallery) {
        rows.push({
          table: "gallery_images",
          id: String(row.id),
          folder: "gallery",
          imageColumnName: "url",
          imageColumnValue: typeof row.url === "string" ? row.url : "",
          textFields: [
            {
              column: "caption",
              value: typeof row.caption === "string" ? row.caption : "",
            },
          ],
        });
      }
      return rows;
    },

    async getUsedMediaBytes() {
      const rows = (await sql`
        SELECT COALESCE(SUM(size_bytes), 0) AS total_bytes FROM media_objects
      `) as Array<{ total_bytes: number | string | null }>;
      return Number(rows[0]?.total_bytes ?? 0);
    },

    async insertMediaObject(input) {
      await sql`
        INSERT INTO media_objects (
          key, folder, size_bytes, thumb_size_bytes, content_type, width, height
        )
        VALUES (
          ${input.key},
          ${input.folder},
          ${input.sizeBytes},
          ${input.thumbSizeBytes},
          ${input.contentType},
          ${input.width},
          ${input.height}
        )
        ON CONFLICT (key) DO UPDATE SET
          folder = EXCLUDED.folder,
          size_bytes = EXCLUDED.size_bytes,
          thumb_size_bytes = EXCLUDED.thumb_size_bytes,
          content_type = EXCLUDED.content_type,
          width = EXCLUDED.width,
          height = EXCLUDED.height
      `;
    },

    async updateRow(table, id, updates) {
      if (table === "articles") {
        if (updates.thumbnail_url !== undefined) {
          await sql`
            UPDATE articles
            SET thumbnail_url = ${updates.thumbnail_url}, updated_at = NOW()
            WHERE id = ${id}
          `;
        }
        if (updates.content !== undefined) {
          await sql`
            UPDATE articles
            SET content = ${updates.content}, updated_at = NOW()
            WHERE id = ${id}
          `;
        }
        if (updates.excerpt !== undefined) {
          await sql`
            UPDATE articles
            SET excerpt = ${updates.excerpt}, updated_at = NOW()
            WHERE id = ${id}
          `;
        }
        return;
      }

      if (updates.url !== undefined) {
        await sql`
          UPDATE gallery_images
          SET url = ${updates.url}, updated_at = NOW()
          WHERE id = ${id}
        `;
      }
      if (updates.caption !== undefined) {
        await sql`
          UPDATE gallery_images
          SET caption = ${updates.caption}, updated_at = NOW()
          WHERE id = ${id}
        `;
      }
    },
  };
}

function resolvePublicDomainFromEnv(explicitDomain?: string): string {
  const raw = (explicitDomain ?? process.env.R2_PUBLIC_DOMAIN)?.trim();
  if (!raw) {
    throw new Error("R2_PUBLIC_DOMAIN wajib diisi.");
  }
  const parsed = new URL(raw);
  if (parsed.protocol !== "https:") {
    throw new Error("R2_PUBLIC_DOMAIN harus memakai https://.");
  }
  return raw.replace(/\/+$/, "");
}

function resolveR2ProviderFromEnv(): {
  storage: StorageProvider;
  publicDomain: string;
  quotaMb: number;
  bucketName: string;
} {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.R2_ENDPOINT?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const publicDomain = resolvePublicDomainFromEnv();

  if (!accessKeyId || !secretAccessKey || !endpoint || !bucketName) {
    throw new Error(
      "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, dan R2_BUCKET_NAME wajib diisi saat --execute.",
    );
  }

  const rawQuota = Number(process.env.R2_APP_QUOTA_MB ?? 2560);
  const quotaMb = Number.isFinite(rawQuota) && rawQuota > 0 ? Math.floor(rawQuota) : 2560;

  return {
    storage: createR2Provider({
      accessKeyId,
      secretAccessKey,
      endpoint,
      bucketName,
    }),
    publicDomain,
    quotaMb,
    bucketName,
  };
}

function loadStateFile(statePath: string, target: MigrationTargetEnv): MigrationStateFile {
  if (!fs.existsSync(statePath)) {
    return {
      version: 1,
      app: "desa-pendil-backend",
      target,
      urlMappings: {},
    };
  }
  const raw = fs.readFileSync(statePath, "utf8");
  const parsed = JSON.parse(raw) as MigrationStateFile;
  if (parsed && parsed.version === 1 && parsed.target === target) {
    return parsed;
  }
  return {
    version: 1,
    app: "desa-pendil-backend",
    target,
    urlMappings: {},
  };
}

function saveStateAtomic(statePath: string, state: MigrationStateFile): void {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const tmp = `${statePath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, statePath);
}

function loadBackupLookup(
  backupDir: string | undefined,
): Map<string, { absPath: string; sha256: string; sizeBytes: number }> {
  const map = new Map<string, { absPath: string; sha256: string; sizeBytes: number }>();
  if (!backupDir) return map;

  const resolvedDir = path.resolve(process.cwd(), backupDir);
  const manifestPath = path.join(resolvedDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest cadangan tidak ditemukan: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as BackupManifest;
  for (const entry of manifest.entries) {
    if (entry.status !== "downloaded") continue;
    const absPath = path.resolve(resolvedDir, entry.localPath);
    if (absPath.startsWith(`${resolvedDir}${path.sep}`) && fs.existsSync(absPath)) {
      map.set(entry.url, {
        absPath,
        sha256: entry.sha256,
        sizeBytes: entry.sizeBytes,
      });
    }
  }
  return map;
}

interface BlobUrlPlan {
  blobUrl: string;
  folderHint: string;
  dedicatedRefs: number;
  richTextRefs: number;
}

function collectMigrationPlan(rows: ScannedMediaRow[]): {
  urlPlans: BlobUrlPlan[];
  affectedRows: ScannedMediaRow[];
} {
  const plans = new Map<string, BlobUrlPlan>();
  const affectedRows: ScannedMediaRow[] = [];

  for (const row of rows) {
    let rowHasBlob = false;
    const trimmedImage = row.imageColumnValue.trim();

    if (isLegacyBlobUrl(trimmedImage)) {
      rowHasBlob = true;
      const existing = plans.get(trimmedImage) ?? {
        blobUrl: trimmedImage,
        folderHint: row.folder,
        dedicatedRefs: 0,
        richTextRefs: 0,
      };
      existing.dedicatedRefs += 1;
      plans.set(trimmedImage, existing);
    }

    for (const field of row.textFields) {
      const inlineUrls = extractBlobUrlsFromText(field.value);
      if (inlineUrls.length > 0) {
        rowHasBlob = true;
        for (const inlineUrl of inlineUrls) {
          const existing = plans.get(inlineUrl) ?? {
            blobUrl: inlineUrl,
            folderHint: row.folder,
            dedicatedRefs: 0,
            richTextRefs: 0,
          };
          existing.richTextRefs += 1;
          plans.set(inlineUrl, existing);
        }
      }
    }

    if (rowHasBlob) {
      affectedRows.push(row);
    }
  }

  return {
    urlPlans: Array.from(plans.values()),
    affectedRows,
  };
}

function isKeyValidForTarget(key: string, target: MigrationTargetEnv): boolean {
  return target === "dev" ? key.startsWith("dev/") : !key.startsWith("dev/");
}

/** Runs idempotent, resumable Vercel Blob to Cloudflare R2 migration (default `--dry-run`). */
export async function runMigration(
  options: MigrateCliOptions,
  deps?: MigrationDeps,
): Promise<MigrationReport> {
  const log = deps?.logger ?? console.log;
  const r2PublicDomain = resolvePublicDomainFromEnv(deps?.r2PublicDomain);
  const nonProdPrefix = options.target !== "production";
  const generateKey = deps?.generateKeyFn ?? generateMediaKey;
  const processImage = deps?.processImage ?? processImagePipeline;

  let db = deps?.db;
  let dbLabel = "injected-db";
  if (!db) {
    const dbUrl = getDatabaseUrlFromEnv();
    dbLabel = redactDatabaseUrl(dbUrl);
    db = createNeonMigrationDb(dbUrl);
  }

  let storage = deps?.storage;
  let quotaMb = deps?.quotaMb ?? 2560;
  let bucketLabel = "(dry-run)";

  if (!options.dryRun && !storage) {
    const resolved = resolveR2ProviderFromEnv();
    storage = resolved.storage;
    quotaMb = deps?.quotaMb ?? resolved.quotaMb;
    bucketLabel = resolved.bucketName;
  }

  log(
    `[migrate] mode=${options.dryRun ? "DRY-RUN" : "EXECUTE"} | target=${options.target} | prefix=${nonProdPrefix ? "dev/" : "<root>"} | concurrency=${options.concurrency} | db=${dbLabel} | bucket=${bucketLabel} | domain=${r2PublicDomain}`,
  );

  const allRows = await db.scanRows();
  const { urlPlans, affectedRows } = collectMigrationPlan(allRows);
  const selectedPlans = options.limit !== undefined ? urlPlans.slice(0, options.limit) : urlPlans;
  const selectedUrlSet = new Set(selectedPlans.map((p) => p.blobUrl));

  log(
    `[scan] rows=${allRows.length} | affectedRows=${affectedRows.length} | uniqueBlobUrls=${urlPlans.length}${options.limit ? ` (limited to ${selectedPlans.length})` : ""}`,
  );

  if (options.dryRun) {
    let estimatedOriginalBytes = 0;
    let dedicatedColumnRewrites = 0;
    let richTextUrlRewrites = 0;

    await runWithConcurrency(selectedPlans, options.concurrency, async (plan) => {
      const sampleKey = generateKey(nonProdPrefix);
      const samplePublicUrl = getPublicMediaUrl(sampleKey, r2PublicDomain);
      const contentLength = await probeBlobContentLength(plan.blobUrl, {
        fetchFn: deps?.fetchFn,
      });
      if (contentLength !== null) {
        estimatedOriginalBytes += contentLength;
      }
      dedicatedColumnRewrites += plan.dedicatedRefs;
      richTextUrlRewrites += plan.richTextRefs;
      log(
        `[dry-run] ${plan.blobUrl} (${contentLength !== null ? formatCliBytes(contentLength) : "unknown size"}) -> key=${sampleKey}${plan.richTextRefs > 0 ? ` | inlineUrl=${samplePublicUrl}` : ""} | refs(col=${plan.dedicatedRefs}, inline=${plan.richTextRefs})`,
      );
    });

    const report: MigrationReport = {
      dryRun: true,
      target: options.target,
      concurrency: options.concurrency,
      scannedRows: allRows.length,
      uniqueBlobUrls: selectedPlans.length,
      plannedOrMigrated: selectedPlans.length,
      reusedFromState: 0,
      failed: 0,
      updatedRows: affectedRows.filter((row) => {
        const trimmed = row.imageColumnValue.trim();
        if (selectedUrlSet.has(trimmed)) return true;
        return row.textFields.some((f) =>
          extractBlobUrlsFromText(f.value).some((u) => selectedUrlSet.has(u)),
        );
      }).length,
      dedicatedColumnRewrites,
      richTextUrlRewrites,
      totalOriginalBytes: estimatedOriginalBytes,
      totalFullBytes: 0,
      totalThumbBytes: 0,
      totalCompressedBytes: 0,
      savedPercent: 0,
      errors: [],
    };
    log(
      `[summary:dry-run] urls=${report.uniqueBlobUrls} | rows=${report.updatedRows} | estimatedOriginal=${formatCliBytes(report.totalOriginalBytes)}`,
    );
    return report;
  }

  if (!storage) {
    throw new Error("Storage provider R2 tidak tersedia pada mode --execute.");
  }

  const statePath = path.resolve(process.cwd(), options.stateFile);
  const state = loadStateFile(statePath, options.target);
  const backupLookup = loadBackupLookup(options.backupDir);
  const quotaBytes = quotaMb * 1024 * 1024;
  let reservedBytes = await db.getUsedMediaBytes();

  let writeStateLock = Promise.resolve();
  const persistState = async () => {
    writeStateLock = writeStateLock.then(() => saveStateAtomic(statePath, state));
    await writeStateLock;
  };

  let migrated = 0;
  let reusedFromState = 0;
  const errors: Array<{ blobUrl: string; message: string }> = [];
  const activeMappings = new Map<string, MigratedUrlMapping>();

  await runWithConcurrency(selectedPlans, options.concurrency, async (plan) => {
    const existing = state.urlMappings[plan.blobUrl];
    if (existing && isKeyValidForTarget(existing.key, options.target)) {
      await db.insertMediaObject({
        key: existing.key,
        folder: plan.folderHint,
        sizeBytes: existing.totalCompressedSize,
        thumbSizeBytes: existing.thumbSize,
        contentType: "image/webp",
        width: existing.width,
        height: existing.height,
      });
      activeMappings.set(plan.blobUrl, existing);
      reusedFromState += 1;
      log(`[resume] ${existing.key} (dari checkpoint) <- ${plan.blobUrl}`);
      return;
    }

    try {
      assertAllowedBlobUrl(plan.blobUrl);

      let sourceBytes: Uint8Array | undefined;
      const backedUp = backupLookup.get(plan.blobUrl);
      if (backedUp) {
        const candidate = new Uint8Array(fs.readFileSync(backedUp.absPath));
        if (
          candidate.byteLength === backedUp.sizeBytes &&
          sha256Hex(candidate) === backedUp.sha256
        ) {
          sourceBytes = candidate;
        }
      }

      if (!sourceBytes) {
        const downloaded = await downloadBlobFile(plan.blobUrl, {
          fetchFn: deps?.fetchFn,
        });
        sourceBytes = downloaded.bytes;
      }

      const processed = await processImage(sourceBytes);
      if (quotaBytes > 0 && reservedBytes + processed.totalCompressedSize > quotaBytes) {
        throw new Error(
          `Kuota R2 (${quotaMb} MB) akan terlampaui setelah menambah ${formatCliBytes(processed.totalCompressedSize)}.`,
        );
      }
      reservedBytes += processed.totalCompressedSize;

      const fullKey = generateKey(nonProdPrefix);
      const thumbKey = deriveThumbKey(fullKey);

      await storage.putObject({
        key: fullKey,
        body: processed.fullBuffer,
        contentType: "image/webp",
        cacheControl: IMMUTABLE_CACHE_CONTROL,
      });

      try {
        await storage.putObject({
          key: thumbKey,
          body: processed.thumbBuffer,
          contentType: "image/webp",
          cacheControl: IMMUTABLE_CACHE_CONTROL,
        });
      } catch (err) {
        reservedBytes -= processed.totalCompressedSize;
        await storage.deleteObjects([fullKey]).catch(() => {});
        throw err;
      }

      try {
        await db.insertMediaObject({
          key: fullKey,
          folder: plan.folderHint,
          sizeBytes: processed.totalCompressedSize,
          thumbSizeBytes: processed.thumbSize,
          contentType: "image/webp",
          width: processed.width,
          height: processed.height,
        });
      } catch (err) {
        reservedBytes -= processed.totalCompressedSize;
        await storage.deleteObjects([fullKey, thumbKey]).catch(() => {});
        throw err;
      }

      const mapping: MigratedUrlMapping = {
        blobUrl: plan.blobUrl,
        key: fullKey,
        thumbKey,
        publicUrl: getPublicMediaUrl(fullKey, r2PublicDomain),
        originalSize: processed.originalSize,
        fullSize: processed.fullSize,
        thumbSize: processed.thumbSize,
        totalCompressedSize: processed.totalCompressedSize,
        width: processed.width,
        height: processed.height,
        migratedAt: new Date().toISOString(),
      };

      state.urlMappings[plan.blobUrl] = mapping;
      activeMappings.set(plan.blobUrl, mapping);
      await persistState();
      migrated += 1;

      log(
        `[ok] ${fullKey} | ${formatCliBytes(processed.originalSize)} -> ${formatCliBytes(processed.fullSize)} + ${formatCliBytes(processed.thumbSize)} (hemat ${processed.savedPercent}%)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ blobUrl: plan.blobUrl, message });
      log(`[fail] ${plan.blobUrl}: ${message}`);
    }
  });

  const textReplacementMap = new Map<string, string>();
  for (const [blobUrl, mapping] of activeMappings.entries()) {
    textReplacementMap.set(blobUrl, getPublicMediaUrl(mapping.key, r2PublicDomain));
  }

  let updatedRows = 0;
  let dedicatedColumnRewrites = 0;
  let richTextUrlRewrites = 0;

  for (const row of affectedRows) {
    const updates: {
      thumbnail_url?: string;
      url?: string;
      content?: string;
      excerpt?: string;
      caption?: string;
    } = {};

    const trimmedImage = row.imageColumnValue.trim();
    const mappedCol = activeMappings.get(trimmedImage);
    if (mappedCol && trimmedImage !== mappedCol.key) {
      updates[row.imageColumnName] = mappedCol.key;
      dedicatedColumnRewrites += 1;
    }

    for (const field of row.textFields) {
      const { nextText, replacedCount } = replaceBlobUrlsInText(field.value, textReplacementMap);
      if (replacedCount > 0 && nextText !== field.value) {
        updates[field.column] = nextText;
        richTextUrlRewrites += replacedCount;
      }
    }

    if (
      updates.thumbnail_url !== undefined ||
      updates.url !== undefined ||
      updates.content !== undefined ||
      updates.excerpt !== undefined ||
      updates.caption !== undefined
    ) {
      await db.updateRow(row.table, row.id, updates);
      updatedRows += 1;
    }
  }

  let totalOriginalBytes = 0;
  let totalFullBytes = 0;
  let totalThumbBytes = 0;
  for (const mapping of activeMappings.values()) {
    totalOriginalBytes += mapping.originalSize;
    totalFullBytes += mapping.fullSize;
    totalThumbBytes += mapping.thumbSize;
  }
  const totalCompressedBytes = totalFullBytes + totalThumbBytes;
  const savedPercent =
    totalOriginalBytes > 0
      ? Math.max(
          0,
          Math.round(((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100),
        )
      : 0;

  log(
    `[summary] migrated=${migrated} | reused=${reusedFromState} | failed=${errors.length} | rowsUpdated=${updatedRows} (col=${dedicatedColumnRewrites}, inline=${richTextUrlRewrites}) | before=${formatCliBytes(totalOriginalBytes)} -> after=${formatCliBytes(totalCompressedBytes)} (full=${formatCliBytes(totalFullBytes)}, thumb=${formatCliBytes(totalThumbBytes)}, hemat ${savedPercent}%)`,
  );

  return {
    dryRun: false,
    target: options.target,
    concurrency: options.concurrency,
    scannedRows: allRows.length,
    uniqueBlobUrls: selectedPlans.length,
    plannedOrMigrated: migrated,
    reusedFromState,
    failed: errors.length,
    updatedRows,
    dedicatedColumnRewrites,
    richTextUrlRewrites,
    totalOriginalBytes,
    totalFullBytes,
    totalThumbBytes,
    totalCompressedBytes,
    savedPercent,
    errors,
  };
}

if (import.meta.main) {
  try {
    const options = parseMigrateArgs(process.argv.slice(2));
    if (options.help) {
      printMigrateHelp();
      process.exit(0);
    }
    const envLoaded = loadCliEnv(options.envFile);
    if (envLoaded) {
      console.log(`[env] Memuat konfigurasi dari ${envLoaded}`);
    }
    const report = await runMigration(options);
    if (report.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`[migrate:error] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
