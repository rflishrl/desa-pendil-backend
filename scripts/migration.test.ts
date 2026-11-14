import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { IMMUTABLE_CACHE_CONTROL, isValidMediaKey } from "@/lib/storage/media-url";
import type { PutObjectInput, StorageProvider } from "@/lib/storage/types";

import { parseBackupArgs, runBackup } from "./backup-blob";
import {
  assertAllowedBlobUrl,
  downloadBlobFile,
  extractBlobUrlsFromText,
  replaceBlobUrlsInText,
  sha256Hex,
} from "./lib/blob-transfer";
import {
  type InsertMediaRecordInput,
  type MigrationDbAdapter,
  parseMigrateArgs,
  runMigration,
  type ScannedMediaRow,
} from "./migrate-blob-to-r2";

const TINY_PNG = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
    "base64",
  ),
);

const UUID_1 = "550e8400-e29b-41d4-a716-446655440001";
const UUID_2 = "550e8400-e29b-41d4-a716-446655440002";
const BLOB_BASE = "https://xyz999.public.blob.vercel-storage.com";
const R2_DOMAIN = "https://media-dp.raflisahrul.my.id";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("blob-transfer security and rich-text rewriting", () => {
  it("hanya mengizinkan URL HTTPS dari host *.public.blob.vercel-storage.com", () => {
    expect(assertAllowedBlobUrl(`${BLOB_BASE}/desa-pendil/foto-1.png`).hostname).toBe(
      "xyz999.public.blob.vercel-storage.com",
    );
    expect(() =>
      assertAllowedBlobUrl("http://xyz999.public.blob.vercel-storage.com/a.png"),
    ).toThrow(/bukan host Vercel Blob/i);
    expect(() => assertAllowedBlobUrl("https://evil.example.com/a.png")).toThrow(
      /bukan host Vercel Blob/i,
    );
    expect(() => assertAllowedBlobUrl("http://127.0.0.1:8080/a.png")).toThrow(
      /bukan host Vercel Blob/i,
    );
  });

  it("menolak redirect ke host non-Blob dan file yang melebihi batas ukuran", async () => {
    const redirectFetch = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://evil.example.com/secret.png" },
        }),
    );

    await expect(
      downloadBlobFile(`${BLOB_BASE}/a.png`, { fetchFn: redirectFetch }),
    ).rejects.toThrow(/bukan host Vercel Blob/i);

    const oversizedHeaderFetch = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-length": "2048" },
        }),
    );
    await expect(
      downloadBlobFile(`${BLOB_BASE}/big.png`, {
        fetchFn: oversizedHeaderFetch,
        maxBytes: 1024,
      }),
    ).rejects.toThrow(/melebihi batas/i);
  });

  it("mengekstrak dan mengganti URL Blob inline di konten artikel menjadi URL R2 publik", () => {
    const urlA = `${BLOB_BASE}/desa-pendil/berita-1.jpg`;
    const urlB = `${BLOB_BASE}/desa-pendil/lampiran-2.png`;
    const content = `<article><img src="${urlA}" alt="Berita" /></article>\n![Foto](${urlB})\nSumber: ${urlA}.`;

    expect(extractBlobUrlsFromText(content)).toEqual([urlA, urlB]);

    const replacements = new Map([
      [urlA, `${R2_DOMAIN}/dev/${UUID_1}.webp`],
      [urlB, `${R2_DOMAIN}/dev/${UUID_2}.webp`],
    ]);
    const { nextText, replacedCount } = replaceBlobUrlsInText(content, replacements);

    expect(replacedCount).toBe(3);
    expect(nextText).toContain(`<img src="${R2_DOMAIN}/dev/${UUID_1}.webp"`);
    expect(nextText).toContain(`![Foto](${R2_DOMAIN}/dev/${UUID_2}.webp)`);
    expect(nextText).toContain(`Sumber: ${R2_DOMAIN}/dev/${UUID_1}.webp.`);
    expect(nextText).not.toContain(BLOB_BASE);
  });
});

describe("CLI flag parsers", () => {
  it("menjadikan --dry-run dan --target=dev sebagai default yang aman pada migrasi", () => {
    const defaults = parseMigrateArgs([]);
    expect(defaults.dryRun).toBe(true);
    expect(defaults.target).toBe("dev");
    expect(defaults.concurrency).toBe(2);

    const execProd = parseMigrateArgs(["--execute", "--target=production", "--concurrency=1"]);
    expect(execProd.dryRun).toBe(false);
    expect(execProd.target).toBe("production");
    expect(execProd.concurrency).toBe(1);

    expect(() => parseMigrateArgs(["--dry-run", "--execute"])).toThrow();
    expect(() => parseMigrateArgs(["--concurrency=3"])).toThrow();
    expect(() => parseMigrateArgs(["--target=staging"])).toThrow();

    const backupOpts = parseBackupArgs(["--dry-run", "--prefix=desa-pendil/"]);
    expect(backupOpts.dryRun).toBe(true);
    expect(backupOpts.prefix).toBe("desa-pendil/");
  });
});

describe("scripts/backup-blob", () => {
  it("mengunduh cadangan ke folder lokal dengan manifest SHA-256 dan idempoten saat dijalankan ulang", async () => {
    const outDir = makeTempDir("dp-backup-");
    const urlA = `${BLOB_BASE}/desa-pendil/artikel-1.png`;
    const urlB = `${BLOB_BASE}/desa-pendil/../../escape.png`;

    const fetchFn = vi.fn(
      async () =>
        new Response(TINY_PNG, {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
    );

    const opts = parseBackupArgs([`--out=${outDir}`, "--no-db"]);
    const first = await runBackup(opts, {
      listBlobsFn: async () => [
        { url: urlA, pathname: "desa-pendil/artikel-1.png", size: 70 },
        { url: urlB, pathname: "../../escape.png", size: 70 },
      ],
      fetchFn,
      logger: () => {},
    });

    expect(first.dryRun).toBe(false);
    expect(first.downloaded).toBe(2);
    expect(first.failed).toBe(0);

    const manifest = JSON.parse(fs.readFileSync(first.manifestPath, "utf8"));
    expect(manifest.downloadedCount).toBe(2);
    expect(manifest.entries[0].sha256).toBe(sha256Hex(TINY_PNG));
    for (const entry of manifest.entries) {
      const resolved = path.resolve(outDir, entry.localPath);
      expect(resolved.startsWith(path.resolve(outDir))).toBe(true);
      expect(fs.existsSync(resolved)).toBe(true);
    }

    fetchFn.mockClear();
    const resumed = await runBackup(opts, {
      listBlobsFn: async () => [
        { url: urlA, pathname: "desa-pendil/artikel-1.png", size: 70 },
        { url: urlB, pathname: "../../escape.png", size: 70 },
      ],
      fetchFn,
      logger: () => {},
    });

    expect(resumed.downloaded).toBe(0);
    expect(resumed.skippedExisting).toBe(2);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

function createInMemoryDb(initialRows: ScannedMediaRow[]) {
  const rows = initialRows.map((row) => ({
    ...row,
    textFields: row.textFields.map((f) => ({ ...f })),
  }));
  const mediaObjects: InsertMediaRecordInput[] = [];
  let updateCalls = 0;

  const adapter: MigrationDbAdapter = {
    async scanRows() {
      return rows.map((row) => ({
        ...row,
        textFields: row.textFields.map((f) => ({ ...f })),
      }));
    },
    async getUsedMediaBytes() {
      return mediaObjects.reduce((sum, item) => sum + item.sizeBytes, 0);
    },
    async insertMediaObject(input) {
      mediaObjects.push(input);
    },
    async updateRow(table, id, updates) {
      updateCalls += 1;
      const target = rows.find((r) => r.table === table && r.id === id);
      if (!target) return;
      if (updates.thumbnail_url !== undefined) {
        target.imageColumnValue = updates.thumbnail_url;
      }
      if (updates.url !== undefined) {
        target.imageColumnValue = updates.url;
      }
      if (updates.content !== undefined) {
        const field = target.textFields.find((f) => f.column === "content");
        if (field) field.value = updates.content;
      }
      if (updates.excerpt !== undefined) {
        const field = target.textFields.find((f) => f.column === "excerpt");
        if (field) field.value = updates.excerpt;
      }
      if (updates.caption !== undefined) {
        const field = target.textFields.find((f) => f.column === "caption");
        if (field) field.value = updates.caption;
      }
    },
  };

  return {
    adapter,
    rows,
    mediaObjects,
    getUpdateCalls: () => updateCalls,
  };
}

describe("scripts/migrate-blob-to-r2", () => {
  it("mode --dry-run (default) menduplikasi URL dengan benar tanpa menulis R2 atau DB", async () => {
    const workDir = makeTempDir("dp-dry-");
    const urlThumb = `${BLOB_BASE}/desa-pendil/thumb.png`;
    const urlInline = `${BLOB_BASE}/desa-pendil/inline.png`;

    const db = createInMemoryDb([
      {
        table: "articles",
        id: "a1",
        folder: "articles",
        imageColumnName: "thumbnail_url",
        imageColumnValue: urlThumb,
        textFields: [
          {
            column: "content",
            value: `<p>Artikel <img src="${urlInline}" /></p>`,
          },
          { column: "excerpt", value: "" },
        ],
      },
      {
        table: "gallery_images",
        id: "g1",
        folder: "gallery",
        imageColumnName: "url",
        imageColumnValue: urlThumb,
        textFields: [{ column: "caption", value: "" }],
      },
    ]);

    const fetchFn = vi.fn(
      async (_input, init) =>
        new Response(init?.method === "HEAD" ? null : TINY_PNG, {
          status: 200,
          headers: { "content-length": String(TINY_PNG.byteLength) },
        }),
    );

    const opts = parseMigrateArgs([`--state-file=${path.join(workDir, "state.json")}`]);
    const report = await runMigration(opts, {
      db: db.adapter,
      r2PublicDomain: R2_DOMAIN,
      fetchFn,
      generateKeyFn: () => `dev/${UUID_1}.webp`,
      logger: () => {},
    });

    expect(report.dryRun).toBe(true);
    expect(report.uniqueBlobUrls).toBe(2);
    expect(report.dedicatedColumnRewrites).toBe(2);
    expect(report.richTextUrlRewrites).toBe(1);
    expect(report.updatedRows).toBe(2);
    expect(db.getUpdateCalls()).toBe(0);
    expect(db.mediaObjects).toHaveLength(0);
  });

  it("mode --execute mengonversi via Bun.Image, mengunggah R2, memperbarui kolom key & rich-text URL, dan idempoten", async () => {
    const workDir = makeTempDir("dp-exec-");
    const stateFile = path.join(workDir, "state-dev.json");
    const urlCol = `${BLOB_BASE}/desa-pendil/thumb.png`;
    const urlInline = `${BLOB_BASE}/desa-pendil/inline.png`;

    const db = createInMemoryDb([
      {
        table: "articles",
        id: "a1",
        folder: "articles",
        imageColumnName: "thumbnail_url",
        imageColumnValue: urlCol,
        textFields: [
          {
            column: "content",
            value: `Isi artikel: <img src="${urlInline}" alt="kegiatan" />`,
          },
          { column: "excerpt", value: "" },
        ],
      },
      {
        table: "gallery_images",
        id: "g1",
        folder: "gallery",
        imageColumnName: "url",
        imageColumnValue: "already-migrated.webp",
        textFields: [{ column: "caption", value: "" }],
      },
    ]);

    const uploaded = new Map<string, PutObjectInput>();
    const storage: StorageProvider = {
      name: "r2",
      async putObject(input) {
        uploaded.set(input.key, input);
        return { key: input.key, etag: "1", sizeBytes: TINY_PNG.byteLength };
      },
      async deleteObjects(keys) {
        for (const k of keys) uploaded.delete(k);
        return { deleted: keys, failed: [] };
      },
      async headObject() {
        return null;
      },
      async listObjects() {
        return { items: [], isTruncated: false, nextContinuationToken: null };
      },
    };

    const uuids = [`dev/${UUID_1}.webp`, `dev/${UUID_2}.webp`];
    let keyIdx = 0;

    const report = await runMigration(
      parseMigrateArgs(["--execute", "--target=dev", `--state-file=${stateFile}`]),
      {
        db: db.adapter,
        storage,
        r2PublicDomain: R2_DOMAIN,
        fetchFn: async () => new Response(TINY_PNG, { status: 200 }),
        generateKeyFn: () => uuids[keyIdx++] ?? `dev/${UUID_2}.webp`,
        logger: () => {},
      },
    );

    expect(report.dryRun).toBe(false);
    expect(report.target).toBe("dev");
    expect(report.plannedOrMigrated).toBe(2);
    expect(report.failed).toBe(0);
    expect(report.updatedRows).toBe(1);
    expect(report.dedicatedColumnRewrites).toBe(1);
    expect(report.richTextUrlRewrites).toBe(1);
    expect(report.totalCompressedBytes).toBeGreaterThan(0);

    expect(isValidMediaKey(db.rows[0]?.imageColumnValue ?? "")).toBe(true);
    expect(db.rows[0]?.imageColumnValue.startsWith("dev/")).toBe(true);
    const updatedContent = db.rows[0]?.textFields[0]?.value ?? "";
    expect(updatedContent).toContain(`<img src="${R2_DOMAIN}/dev/`);
    expect(updatedContent).not.toContain(BLOB_BASE);
    expect(db.rows[1]?.imageColumnValue).toBe("already-migrated.webp");

    expect(uploaded.size).toBe(4);
    for (const input of uploaded.values()) {
      expect(input.cacheControl).toBe(IMMUTABLE_CACHE_CONTROL);
      expect(input.contentType).toBe("image/webp");
    }
    expect(db.mediaObjects).toHaveLength(2);

    const secondRun = await runMigration(
      parseMigrateArgs(["--execute", "--target=dev", `--state-file=${stateFile}`]),
      {
        db: db.adapter,
        storage,
        r2PublicDomain: R2_DOMAIN,
        fetchFn: async () => {
          throw new Error("Should not fetch on idempotent re-run");
        },
        logger: () => {},
      },
    );
    expect(secondRun.uniqueBlobUrls).toBe(0);
    expect(secondRun.updatedRows).toBe(0);
  });

  it("melakukan rollback full object ketika PUT thumb gagal tanpa mengubah DB", async () => {
    const workDir = makeTempDir("dp-fail-");
    const urlCol = `${BLOB_BASE}/desa-pendil/broken.png`;
    const db = createInMemoryDb([
      {
        table: "articles",
        id: "a1",
        folder: "articles",
        imageColumnName: "thumbnail_url",
        imageColumnValue: urlCol,
        textFields: [{ column: "content", value: "Teks" }],
      },
    ]);

    const deleteObjects = vi.fn(async (keys: string[]) => ({
      deleted: keys,
      failed: [],
    }));
    let putCount = 0;
    const storage: StorageProvider = {
      name: "r2",
      async putObject(input) {
        putCount += 1;
        if (putCount === 2) {
          throw new Error("R2 thumb upload timeout");
        }
        return { key: input.key, etag: "1", sizeBytes: 10 };
      },
      deleteObjects,
      async headObject() {
        return null;
      },
      async listObjects() {
        return { items: [], isTruncated: false, nextContinuationToken: null };
      },
    };

    const report = await runMigration(
      parseMigrateArgs([
        "--execute",
        "--target=production",
        "--concurrency=1",
        `--state-file=${path.join(workDir, "state-prod.json")}`,
      ]),
      {
        db: db.adapter,
        storage,
        r2PublicDomain: R2_DOMAIN,
        fetchFn: async () => new Response(TINY_PNG, { status: 200 }),
        generateKeyFn: () => `${UUID_1}.webp`,
        logger: () => {},
      },
    );

    expect(report.failed).toBe(1);
    expect(report.updatedRows).toBe(0);
    expect(deleteObjects).toHaveBeenCalledWith([`${UUID_1}.webp`]);
    expect(db.rows[0]?.imageColumnValue).toBe(urlCol);
    expect(db.mediaObjects).toHaveLength(0);
  });
});
