/**
 * End-to-end smoke test without Docker: runs the real migrations and services on
 * an in-memory PostgreSQL (PGlite). Run: npm run test:smoke
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const uploadDir = mkdtempSync(path.join(tmpdir(), "dp-smoke-"));
Object.assign(process.env, {
  DATABASE_URL: "postgres://unused",
  AUTH_SECRET: "x".repeat(40),
  FRONTEND_ORIGINS: "http://localhost:3000",
  PUBLIC_BASE_URL: "http://localhost:4000",
  UPLOAD_DIR: uploadDir,
});
delete process.env.BLOB_READ_WRITE_TOKEN;

const { PGlite } = await import("@electric-sql/pglite");
const { drizzle } = await import("drizzle-orm/pglite");
const { migrate } = await import("drizzle-orm/pglite/migrator");
const { setDbForTests } = await import("../src/db");
const schema = await import("../src/db/schema");

const client = new PGlite();
const db = drizzle(client, { schema });
await migrate(db, { migrationsFolder: "./drizzle" });
setDbForTests(db as never);

let passed = 0;
async function step(name: string, fn: () => Promise<void> | void) {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const { hashPassword, verifyPassword } = await import("../src/lib/auth/password");
const { signSession, verifySession } = await import("../src/lib/auth/token");
const { upsertAdmin, findAdminByEmail } = await import("../src/services/admins");
const articles = await import("../src/services/articles");
const gallery = await import("../src/services/gallery");
const { saveImage, sniffImage } = await import("../src/lib/storage");
const { articleInputSchema } = await import("../src/lib/validation");
const newsRoute = await import("../src/app/v1/news/route");
const newsItemRoute = await import("../src/app/v1/news/[id]/route");
const galleryRoute = await import("../src/app/v1/gallery/route");

// 1x1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const png = (name = "a.png") => new File([PNG], name, { type: "image/png" });

console.log("Smoke test");

await step("password hash verifies only the right password", async () => {
  const hash = await hashPassword("correct horse battery");
  assert.equal(await verifyPassword("correct horse battery", hash), true);
  assert.equal(await verifyPassword("wrong", hash), false);
  assert.equal(await verifyPassword("x", "garbage"), false);
});

await step("admin upsert + lookup is case-insensitive", async () => {
  await upsertAdmin({ email: "Admin@Desa.test", name: "A", password: "longenough-pass" });
  const admin = await findAdminByEmail("admin@desa.test");
  assert.ok(admin);
  assert.equal(await verifyPassword("longenough-pass", admin.passwordHash), true);
  await upsertAdmin({ email: "admin@desa.test", name: "B", password: "another-long-pass" });
  assert.equal((await findAdminByEmail("admin@desa.test"))?.name, "B");
});

await step("session token round-trips and rejects tampering/wrong secret", async () => {
  const secret = "s".repeat(40);
  const token = await signSession({ adminId: "id-1", email: "a@b.c" }, secret);
  assert.deepEqual(await verifySession(token, secret), { adminId: "id-1", email: "a@b.c" });
  assert.equal(await verifySession(token + "x", secret), null);
  assert.equal(await verifySession(token, "o".repeat(40)), null);
  assert.equal(await verifySession(undefined, secret), null);
});

await step("image upload checks magic bytes, not filename", async () => {
  assert.equal(sniffImage(new Uint8Array(PNG))?.ext, "png");
  const url = await saveImage(png("evil.php"), "articles");
  assert.match(url, /^\/uploads\/articles\/[0-9a-f-]+\.png$/);
  await assert.rejects(
    saveImage(new File(["<?php echo 1;"], "a.png", { type: "image/png" }), "gallery"),
    /JPG, PNG, atau WebP/,
  );
  await assert.rejects(
    saveImage(new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.png"), "gallery"),
    /4 MB/,
  );
});

let published: Awaited<ReturnType<typeof articles.createArticle>>;

await step("create: slug is unique, publishing sets publishedAt", async () => {
  const input = articleInputSchema.parse({
    title: "Desa Pendil Raih Penghargaan!",
    type: "berita",
    content: "Paragraf satu.\n\nParagraf dua.",
    status: "published",
  });
  published = await articles.createArticle(input);
  const twin = await articles.createArticle(input);
  assert.equal(published.slug, "desa-pendil-raih-penghargaan");
  assert.notEqual(twin.slug, published.slug);
  assert.ok(published.publishedAt);
});

await step("validation rejects bad input", () => {
  const r = articleInputSchema.safeParse({ title: "ab", type: "iklan", content: "", status: "draft" });
  assert.equal(r.success, false);
  const bad = articleInputSchema.safeParse({
    title: "Judul sah", type: "berita", content: "x", status: "draft", thumbnailUrl: "javascript:alert(1)",
  });
  assert.equal(bad.success, false);
});

await step("public list hides drafts, scheduled posts and other types", async () => {
  await articles.createArticle(articleInputSchema.parse({ title: "Masih draf", type: "berita", content: "x", status: "draft" }));
  await articles.createArticle(
    articleInputSchema.parse({
      title: "Terjadwal besok", type: "berita", content: "x", status: "published",
      publishedAt: new Date(Date.now() + 86_400_000),
    }),
  );
  await articles.createArticle(articleInputSchema.parse({ title: "Sebuah artikel", type: "artikel", content: "x", status: "published" }));

  const pub = await articles.listArticles({ type: "berita", publicOnly: true });
  assert.deepEqual(pub.items.map((a) => a.title).sort(), ["Desa Pendil Raih Penghargaan!", "Desa Pendil Raih Penghargaan!"]);
  const all = await articles.listArticles({});
  assert.equal(all.total, 5);
  assert.equal((await articles.listArticles({ status: "draft" })).total, 1);
});

await step("search escapes LIKE wildcards", async () => {
  assert.equal((await articles.listArticles({ q: "%" })).total, 0);
  assert.equal((await articles.listArticles({ q: "penghargaan" })).total, 2);
});

await step("update: thumbnail swap deletes the old file; clearing excerpt works", async () => {
  const first = await saveImage(png(), "articles");
  const withThumb = await articles.updateArticle(published.id, { thumbnailUrl: first, excerpt: "ringkas" });
  const firstFile = path.join(uploadDir, first.replace("/uploads/", ""));
  assert.ok(existsSync(firstFile));

  const second = await saveImage(png(), "articles");
  const swapped = await articles.updateArticle(withThumb.id, { thumbnailUrl: second, excerpt: null });
  assert.equal(swapped.excerpt, null);
  assert.equal(existsSync(firstFile), false);

  const cleared = await articles.updateArticle(swapped.id, { thumbnailUrl: null });
  assert.equal(cleared.thumbnailUrl, null);
  assert.equal(existsSync(path.join(uploadDir, second.replace("/uploads/", ""))), false);
});

await step("publishing a draft fills publishedAt", async () => {
  const draft = (await articles.listArticles({ status: "draft" })).items[0]!;
  const out = await articles.updateArticle(draft.id, { status: "published" });
  assert.ok(out.publishedAt);
});

await step("GET /v1/news matches the legacy shape the frontend reads + CORS", async () => {
  const req = new Request("http://x/v1/news", { headers: { origin: "http://localhost:3000" } });
  const res = await newsRoute.GET(req);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:3000");
  const body = (await res.json()) as { data: Record<string, unknown>[]; meta: { total: number } };
  assert.ok(body.data.length >= 2);
  for (const key of ["id", "judul", "isi", "author", "thumbnail", "createdAt"]) {
    assert.ok(key in body.data[0]!, `missing ${key}`);
  }
  assert.ok(!Number.isNaN(Date.parse(String(body.data[0]!.createdAt))));
  const evil = await newsRoute.GET(new Request("http://x/v1/news", { headers: { origin: "http://evil.test" } }));
  assert.equal(evil.headers.get("access-control-allow-origin"), null);
});

await step("GET /v1/news/:id returns published berita, 404 for drafts/other types", async () => {
  const ok = await newsItemRoute.GET(new Request("http://x"), { params: Promise.resolve({ id: published.id }) });
  assert.equal(ok.status, 200);
  const bySlug = await newsItemRoute.GET(new Request("http://x"), { params: Promise.resolve({ id: "desa-pendil-raih-penghargaan" }) });
  assert.equal(bySlug.status, 200);
  const artikel = (await articles.listArticles({ type: "artikel" })).items[0]!;
  const nf = await newsItemRoute.GET(new Request("http://x"), { params: Promise.resolve({ id: artikel.id }) });
  assert.equal(nf.status, 404);
});

await step("delete article removes row and thumbnail", async () => {
  const url = await saveImage(png(), "articles");
  const a = await articles.createArticle(articleInputSchema.parse({ title: "Akan dihapus", type: "postingan", content: "x", status: "draft", thumbnailUrl: url }));
  await articles.deleteArticle(a.id);
  assert.equal(await articles.findArticle(a.id), undefined);
  assert.equal(existsSync(path.join(uploadDir, url.replace("/uploads/", ""))), false);
  await assert.rejects(articles.deleteArticle(a.id), /tidak ditemukan/);
});

await step("gallery: create, order, update, delete + public endpoint", async () => {
  const u1 = await saveImage(png(), "gallery");
  const u2 = await saveImage(png(), "gallery");
  const g1 = await gallery.createGalleryImage({ url: u1, alt: "Foto pertama", sortOrder: 5 });
  const g2 = await gallery.createGalleryImage({ url: u2, alt: "Foto kedua", sortOrder: 1 });
  assert.deepEqual((await gallery.listGallery()).map((g) => g.alt), ["Foto kedua", "Foto pertama"]);

  await gallery.updateGalleryImage(g1.id, { sortOrder: 0, alt: "Pertama (edit)" });
  assert.equal((await gallery.listGallery())[0]!.alt, "Pertama (edit)");

  const res = await galleryRoute.GET(new Request("http://x/v1/gallery"));
  const body = (await res.json()) as { data: { src: string; alt: string }[] };
  assert.equal(body.data.length, 2);
  assert.ok(body.data[0]!.src.startsWith("http://localhost:4000/uploads/gallery/"));

  await gallery.deleteGalleryImage(g2.id);
  assert.equal(existsSync(path.join(uploadDir, u2.replace("/uploads/", ""))), false);
  assert.equal(await gallery.countGallery(), 1);
  await assert.rejects(gallery.updateGalleryImage(g2.id, { alt: "x y z" }), /tidak ditemukan/);
});

await client.close();
rmSync(uploadDir, { recursive: true, force: true });
console.log(`\n${passed} checks passed.`);
