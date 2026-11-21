# Migration Notes: TanStack Start -> SvelteKit 3 (`desa-pendil-backend`)

Audit Fase 0 (sebelum perubahan kode aplikasi). Target deployment: Vercel Hobby (Node.js >= 22.17 via `@sveltejs/adapter-vercel`), package manager: Bun (`bun.lock`).

---

## 1. Daftar Rute

Seluruh rute halaman dan API bersifat **dinamis** (sesi cookie admin, Neon PostgreSQL, atau API publik).

### 1A. Rute Halaman

| File Route TanStack | URL Final | Statis / Dinamis | Auth & Catatan |
|---|---|---|---|
| `src/routes/__root.tsx` | *(Root layout)* | Dinamis | `lang="id"`, `noindex, nofollow`, `globals.css`, `ThemeProvider`, `QueryProvider`, `Toaster`, `RootNotFound`, `RootError`. |
| `src/routes/index.tsx` | `/` | Dinamis (redirect) | `beforeLoad`: redirect ke `/admin` jika login, else `/login`. |
| `src/routes/login.tsx` | `/login` | Dinamis | Guest-only (`beforeLoad` redirect ke `/admin` jika login). Render `ThemeToggle` + `LoginForm` (Turnstile). |
| `src/routes/admin.tsx` | `/admin` *(layout)* | Dinamis | Admin-only (`beforeLoad` redirect ke `/login` jika belum login). Render `AdminShell`. |
| `src/routes/admin/index.tsx` | `/admin` | Dinamis | `loader`: `getDashboardData()` (`countArticles`, `countArticles('published')`, `countGalleryImages`, status readiness R2). |
| `src/routes/admin/storage.tsx` | `/admin/storage` | Dinamis (`?page=`) | Monitor kuota R2 & daftar aset (`GET /api/admin/storage`). |
| `src/routes/admin/articles/index.tsx` | `/admin/articles` | Dinamis (`?q=&page=`) | Daftar artikel/berita (`GET /api/admin/articles`). |
| `src/routes/admin/articles/new.tsx` | `/admin/articles/new` | Dinamis | Form tambah artikel (`POST /api/admin/articles`). |
| `src/routes/admin/articles/$id.edit.tsx` | `/admin/articles/:id/edit` | Dinamis | Form edit artikel (`GET/PATCH/DELETE /api/admin/articles/:id`). |
| `src/routes/admin/gallery/index.tsx` | `/admin/gallery` | Dinamis (`?page=`) | Daftar galeri (`GET /api/admin/gallery`). |
| `src/routes/admin/gallery/new.tsx` | `/admin/gallery/new` | Dinamis | Form tambah foto galeri (`POST /api/admin/gallery`). |
| `src/routes/admin/gallery/$id.edit.tsx` | `/admin/gallery/:id/edit` | Dinamis | Form edit foto galeri (`GET/PATCH/DELETE /api/admin/gallery/:id`). |

### 1B. Endpoint API (`src/routes/api/`)

Semua endpoint dibungkus `withApi(...)`.

| File Route | URL Final | Method | Auth / Akses | Rate Limit Eksisting | Menulis Data? (Acuan Prompt 2) |
|---|---|---|---|---|---|
| `api/health.ts` | `/api/health` | `GET` | `public` | `health` (30/60s) | Read-only (`SELECT 1`; menulis counter `rate_limits`) |
| `api/auth/login.ts` | `/api/auth/login` | `POST` | `session` (same-origin + Turnstile + `scrypt`) | `login` (8/600s) | **YA** — set cookie `admin_session`, verifikasi Turnstile, tulis/reset `rate_limits` |
| `api/auth/logout.ts` | `/api/auth/logout` | `POST` | `session` (same-origin) | Tidak ada | **YA** — hapus cookie `admin_session` |
| `api/upload.ts` | `/api/upload` | `POST` | `admin` + same-origin | `upload` (30/600s) | **YA** — upload 2 objek R2 (`full` + `thumb`) & insert `media_objects` |
| `api/admin/articles/index.ts` | `/api/admin/articles` | `GET`, `POST` | `admin` | Tidak ada | `POST`: **YA** — insert `articles` + `revalidateFrontend(["news"])` |
| `api/admin/articles/$id.ts` | `/api/admin/articles/:id` | `GET`, `PATCH`, `DELETE` | `admin` | Tidak ada | `PATCH`/`DELETE`: **YA** — mutasi `articles`, hapus media R2/DB lama, revalidate |
| `api/admin/gallery/index.ts` | `/api/admin/gallery` | `GET`, `POST` | `admin` | Tidak ada | `POST`: **YA** — insert `gallery_images` + `revalidateFrontend(["gallery"])` |
| `api/admin/gallery/$id.ts` | `/api/admin/gallery/:id` | `GET`, `PATCH`, `DELETE` | `admin` | Tidak ada | `PATCH`/`DELETE`: **YA** — mutasi `gallery_images`, hapus media R2/DB lama, revalidate |
| `api/admin/storage.ts` | `/api/admin/storage` | `GET` | `admin` | Tidak ada | Tidak (baca Neon `media_objects`, tanpa R2 `ListObjectsV2`) |
| `api/admin/diagnostics/image.ts` | `/api/admin/diagnostics/image` | `POST` | `admin` | Tidak ada | Tidak (uji kompresi WebP di memori) |
| `api/cron/cleanup-media.ts` | `/api/cron/cleanup-media` | `GET` | `public` + Bearer `CRON_SECRET` | Tidak ada | **YA** — hapus `rate_limits` kedaluwarsa & orphan R2/`media_objects` (>24 jam) |
| `api/news/v1/index.ts` | `/api/news/v1` | `GET` | `public` + CORS (`s-maxage=60, swr=300`) | `publicRead` (120/60s) | Read-only (`type='berita' AND status='published'`) |
| `api/news/v1/$id.ts` | `/api/news/v1/:id` | `GET` | `public` + CORS (`s-maxage=60, swr=300`) | `publicRead` (120/60s) | Read-only (lookup UUID atau slug) |
| `api/gallery/v1/index.ts` | `/api/gallery/v1` | `GET` | `public` + CORS (`s-maxage=60, swr=300`) | `publicRead` (120/60s) | Read-only |

---

## 2. Sumber Data & Cara Akses

- **Database**: Neon Serverless PostgreSQL via `@neondatabase/serverless` (`neon(env.DATABASE_URI)` di `src/lib/db/client.ts`).
- **Tabel (`scripts/schema.sql`)**: `admin_users`, `articles`, `gallery_images`, `rate_limits`, `media_objects`.
- **Akses data**: SQL terparameterisasi di `src/features/*/repository.ts` -> service `src/features/*/service.ts` -> API route handlers & server functions.
- **Script**: `scripts/db-push.mjs`, `scripts/create-admin.mjs`, `scripts/check-boundaries.mjs`.

---

## 3. Server Function, Middleware, Auth, dan Form

- **Server Functions (`createServerFn`)**: `getAuthAdmin`, `getAdminLayoutData`, `getDashboardData`.
- **API Middleware (`src/lib/api/with-api.ts`)**: Request ID (`x-vercel-id`/UUID), same-origin CSRF (`assertSameOrigin` pada method non-safe), rate limiter PostgreSQL (`rate_limits`, fail-open), autentikasi cookie `admin_session`, CORS (`ALLOWED_ORIGINS`) pada endpoint publik, serta pemetaan `AppError`/`ZodError`/`ConfigError`.
- **Auth & Turnstile**: Password `scryptSync` + `timingSafeEqual`, cookie HMAC-SHA256 `admin_session` (7 hari, `HttpOnly`, `SameSite=Lax`, `Secure` di produksi), serta `verifyTurnstile` (fail-closed + proteksi replay `seenTokens` in-memory 5 menit).
- **Form (`react-hook-form` + `zod` v4)**: `LoginForm`, `ArticleForm`, `GalleryForm`, `ImageUploader` (`XMLHttpRequest` progress + pre-shrink `prepare.ts`).

---

## 4. Detail Modul Cloudflare R2 & Pipeline Gambar (Migrasi Fase 5)

- **Klien R2 (`src/lib/storage/r2.ts`, `provider.ts`)**: `aws4fetch` (`AwsClient`, service `"s3"`, region `"auto"`, path-style `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`). Cache-Control `public, max-age=31536000, immutable`.
- **Prefix Key & Domain (`media-key.ts`, `media-url.ts`)**:
  - Production (`VERCEL_ENV === "production"` atau `NODE_ENV === "production"` saat `VERCEL_ENV` unset): `<uuid>.webp` dan `<uuid>-thumb.webp`.
  - Non-production: `dev/<uuid>.webp` dan `dev/<uuid>-thumb.webp`.
  - Custom domain publik: `R2_PUBLIC_DOMAIN` (`https://media-dp.raflisahrul.my.id`). `normalizeMediaInputForStorage()` memangkas origin menjadi key kanonik sebelum disimpan ke DB.
- **Kompresi WebP (`src/features/uploads/image-pipeline.ts`)**:
  - **Saat ini memakai `Bun.Image`** (belum memakai `sharp`), batas input `MAX_UPLOAD_MB` (default/maks `4` MiB), `MAX_IMAGE_PIXELS = 50_000_000`, deteksi magic bytes JPEG/PNG/WebP, penolakan WebP animasi, auto-orient EXIF, dual output WebP:
    - `full`: maks `1920x1920` (`fit: "inside"`, `withoutEnlargement: true`), quality ladder `[80, 72, 64, 56, 48]` hingga `<= 1 MiB` (error `413` jika tetap > 1 MiB).
    - `thumb`: maks `480x480` (`fit: "inside"`, `withoutEnlargement: true`), kualitas `78`.
  - **Catatan migrasi Fase 5**: Karena `@sveltejs/adapter-vercel` 7 hanya mendukung runtime **Node.js (>= 22.17)**, `Bun.Image` wajib diganti dengan **`sharp`** sambil mempertahankan seluruh batas validasi, dimensi, quality ladder, rollback, dan endpoint diagnostik gambar.
- **Quota Guard & Cron Cleanup**: Quota dihitung dari Neon `media_objects` (`R2_APP_QUOTA_MB = 2560` MiB, tanpa `ListObjectsV2` saat runtime); cron harian `/api/cron/cleanup-media` membersihkan `rate_limits` kedaluwarsa dan orphan R2/`media_objects` (> 24 jam).

---

## 5. Dependency React-Spesifik & Padanan SvelteKit 3

| Paket Saat Ini (`desa-pendil-backend`) | Padanan SvelteKit 3 / Rilis Target |
|---|---|
| `@tanstack/react-start` (`1.169.5`), `@tanstack/react-router` (`1.170.46`), `nitro` | `@sveltejs/kit` (3.x stable, `3.2.1`), `@sveltejs/adapter-vercel` (7.x stable, `nodejs24.x`) |
| `react` (`19.3.1`), `react-dom` (`19.3.1`), `@vitejs/plugin-react` | `svelte` (5.x stable, runes), `@sveltejs/vite-plugin-svelte` (7.x stable) |
| `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers` | SvelteKit `load` + `fetch` + Svelte 5 runes (`$state`) + `zod` (`4.6.7`) |
| `radix-ui`, `shadcn` (23 komponen), `lucide-react`, `next-themes`, `sonner`, `@marsidev/react-turnstile` | Komponen Svelte 5 setara (native `<dialog>`, Tailwind v4 token identik) + `@lucide/svelte` + Turnstile script native |
| `Bun.Image` | `sharp` (`^0.35.5`) di Node.js runtime |
| `@neondatabase/serverless`, `aws4fetch`, `zod`, `@fontsource-variable/*`, `tailwindcss` v4 (`4.3.3` -> `4.3.5`) | Tetap dipertahankan |
| `typescript` (`5.9.3`), `@biomejs/biome`, `vitest` (`5.0.5`) | `typescript` (`~6.0.3`), `eslint`/`prettier` + `svelte-check`, `vitest` (`5.1.x`), `@playwright/test` |

---

## 6. Daftar Environment Variable

| Variabel | Scope | Keterangan |
|---|---|---|
| `DATABASE_URI` / `DATABASE_URL` / `POSTGRES_URL` | Private | Koneksi Neon PostgreSQL |
| `SESSION_SECRET` | Private | Kunci HMAC-SHA256 cookie `admin_session` (min 32 char) |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_PUBLIC_DOMAIN` | Private | Konfigurasi Cloudflare R2 (`desa-pendil`, `https://media-dp.raflisahrul.my.id`) |
| `R2_APP_QUOTA_MB` (`2560`), `MAX_UPLOAD_MB` (`4`) | Private | Batas kuota aplikasi & ukuran upload (MiB) |
| `ALLOWED_ORIGINS`, `FRONTEND_URL`, `REVALIDATE_SECRET`, `CRON_SECRET` | Private | CORS publik, webhook revalidasi, secret Vercel Cron |
| `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` | Private | Validasi server Cloudflare Turnstile |
| `VITE_TURNSTILE_SITE_KEY` | Public | Ganti ke `PUBLIC_TURNSTILE_SITE_KEY` (`$app/env/public`, `static: true`) |
| `VERCEL_ENV` / `NODE_ENV` | Runtime | Prefix `dev/` dan cookie `Secure` |

---

## 7. Risiko & Hal Ambigu

1. **Penggantian `Bun.Image` -> `sharp` & penghapusan `bunVersion: "1.x"`**: Adapter Vercel 7 mewajibkan Node.js >= 22.17; `image-pipeline.ts`, `diagnostics-service.ts`, dan unit test terkait harus beralih dari `Bun.Image` ke `sharp`.
2. **Fire-and-forget `revalidateFrontend`**: `src/lib/revalidate.ts` memanggil `sendRevalidate` tanpa `await` / `waitUntil`, sehingga rawan terpotong di fungsi serverless Node.js Vercel — disarankan memakai `waitUntil` dari `@vercel/functions` (jika tersedia) atau fallback aman.
3. **Sesi & Cookie (`@tanstack/react-start/server`)**: Harus dipetakan ke `event.cookies` di `src/hooks.server.ts`, `+page.server.ts`, dan `+server.ts`.
4. **Prefiks env publik (`VITE_TURNSTILE_SITE_KEY` -> `PUBLIC_TURNSTILE_SITE_KEY`)**: Perlu diperbarui di Vercel Environment Variables sebelum deploy.
5. **Node.js lokal belum di PATH & aturan rilis < 14 hari**: Sama seperti `desa-pendil`, eksekusi lokal via Bun `1.4.4`, tetap memakai `@sveltejs/kit@3.2.1` dan `typescript@~6.0.3`.

---

## 8. Baseline Screenshot (`.baseline-screenshots/before/`)

Diambil menggunakan Playwright Chromium terhadap `desa-pendil-backend` (TanStack Start `vite dev` di `http://localhost:4000`):

| File | URL / State | Viewport | HTTP Status |
|---|---|---|---|
| `.baseline-screenshots/before/login-desktop.png` | `/login` | `1440x900` | `200` |
| `.baseline-screenshots/before/login-mobile.png` | `/login` | `390x844` | `200` |
| `.baseline-screenshots/before/not-found-desktop.png` | `/halaman-tidak-ada-404` | `1440x900` | `404` |
| `.baseline-screenshots/before/not-found-mobile.png` | `/halaman-tidak-ada-404` | `390x844` | `404` |
| `.baseline-screenshots/before/admin-dashboard-desktop.png` | `/admin` | `1440x900` | `200` |
| `.baseline-screenshots/before/admin-dashboard-mobile.png` | `/admin` | `390x844` | `200` |
| `.baseline-screenshots/before/admin-storage-desktop.png` | `/admin/storage` | `1440x900` | `200` |
| `.baseline-screenshots/before/admin-storage-mobile.png` | `/admin/storage` | `390x844` | `200` |
| `.baseline-screenshots/before/admin-articles-desktop.png` | `/admin/articles` | `1440x900` | `200` |
| `.baseline-screenshots/before/admin-articles-mobile.png` | `/admin/articles` | `390x844` | `200` |
| `.baseline-screenshots/before/admin-articles-new-desktop.png` | `/admin/articles/new` | `1440x900` | `200` |
| `.baseline-screenshots/before/admin-articles-new-mobile.png` | `/admin/articles/new` | `390x844` | `200` |
| `.baseline-screenshots/before/admin-gallery-desktop.png` | `/admin/gallery` | `1440x900` | `200` |
| `.baseline-screenshots/before/admin-gallery-mobile.png` | `/admin/gallery` | `390x844` | `200` |
| `.baseline-screenshots/before/admin-gallery-new-desktop.png` | `/admin/gallery/new` | `1440x900` | `200` |
| `.baseline-screenshots/before/admin-gallery-new-mobile.png` | `/admin/gallery/new` | `390x844` | `200` |


---

## 9. Catatan Penyelesaian Migrasi (Fase 1–7)

- **Konfigurasi SvelteKit 3**:
  - Tidak ada `svelte.config.js`; seluruh konfigurasi diteruskan ke `sveltekit({...})` di `vite.config.ts`.
  - Alias `#lib` & `#lib/*` di `package.json` (`imports`), nol penggunaan `$lib`.
  - Env dideklarasikan lewat `src/env.ts` (`defineEnvVars`): `$app/env/private` untuk seluruh kredensial/rahasia dan `$app/env/public` (`PUBLIC_TURNSTILE_SITE_KEY`).
  - Adapter: `@sveltejs/adapter-vercel` 7.x (`runtime: 'nodejs24.x'`, `regions: ['sin1']`) dengan wrapper `safeVercelAdapter` untuk kompatibilitas symlink Windows lokal. `bunVersion: "1.x"` dihapus dari `vercel.json`.
- **Migrasi Cloudflare R2 & `sharp` (Fase 5)**:
  - Seluruh modul R2 (`#lib/server/storage/*`, `#lib/server/features/uploads/*`) dipindahkan ke `#lib/server` dengan struktur bucket `desa-pendil`, prefix non-produksi `dev/`, nama env `R2_*`, quota guard (`R2_APP_QUOTA_MB = 2560` MiB di Neon `media_objects`, tanpa `ListObjectsV2`), `MAX_UPLOAD_MB = 4`, dan rollback atomik yang dipertahankan.
  - `Bun.Image` diganti dengan **`sharp`** (`0.35.5`) di `image-pipeline.ts` dan `diagnostics-service.ts`, mempertahankan validasi magic bytes, penolakan WebP animasi/SVG/GIF/AVIF/TIFF & decompression bomb (>50 MP), auto-orient EXIF + strip metadata, dual WebP (`full <= 1920px & <= 1MB` dengan quality ladder `[80, 72, 64, 56, 48]`, `thumb <= 480px` quality `78`).
  - `revalidate.ts` mendukung penjadwalan via `waitUntil` (bila tersedia) dengan fallback `queueMicrotask`.
- **UI & Keamanan**:
  - Seluruh 12 rute halaman & 14 endpoint API (`withApi`) telah diporting ke Svelte 5 runes; `DeleteDialog` dan mobile sidebar drawer memakai elemen native `<dialog>` dengan `overscroll-behavior: contain`.
  - Proteksi replay `seenTokens` dan wildcard hostname pada `turnstile.ts`, serta header `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` pada API publik (`/api/news/v1*`, `/api/gallery/v1`) dipertahankan penuh.
  - `scripts/check-boundaries.mjs` diperbarui untuk SvelteKit 3 (`#lib/server/`, `$app/env/private`, `sharp`, `aws4fetch`, `withApi()`).
- **Versi Final Terpasang (dari `bun.lock`)**:
  - `@sveltejs/kit`: `3.2.1` (menghindari `3.3.0` yang < 14 hari)
  - `svelte`: `5.58.0`
  - `vite`: `8.3.8`
  - `@sveltejs/vite-plugin-svelte`: `7.3.1`
  - `@sveltejs/adapter-vercel`: `7.0.4`
  - `sharp`: `0.35.5`
  - `@neondatabase/serverless`: `1.2.1`
  - `aws4fetch`: `1.0.20`
  - `tailwindcss` & `@tailwindcss/vite`: `4.3.5`
  - `typescript`: `6.0.3`
  - `zod`: `4.6.7`
  - `@lucide/svelte`: `1.74.0`
  - `vitest`: `5.1.1`
  - `@playwright/test`: `1.65.1`
- **Tindak Lanjut Manual di Vercel**:
  - Ubah Node.js Version ke **24.x** di Vercel Project Settings.
  - Ganti env publik `VITE_TURNSTILE_SITE_KEY` menjadi `PUBLIC_TURNSTILE_SITE_KEY`.

---

## 10. Rate Limiter Berlapis & Anti-Spam (Prompt 2 — `feat/rate-limiter`)

- **Backend Rate Limiter (`#lib/server/api/rate-limit.js` & `#lib/server/api/rate-limits.js`)**:
  - Mempertahankan store **Neon PostgreSQL (`rate_limits`)** dengan fail-open logging (`warn` saat DB bermasalah), sehingga tidak memerlukan layanan/env Upstash tambahan.
  - Prefix kunci: `rl:desa-pendil`.
  - `login`: batas **5 permintaan / 15 menit** per `clientIp:email` (memakai `getClientAddress()` SvelteKit melalui `withApi` dengan fallback header proxy Vercel), mereset counter saat login berhasil, dan mengembalikan HTTP `429` pesan Bahasa Indonesia + header `Retry-After`.
  - `upload`: batas **20 permintaan / menit** per `actor.id`, dijalankan **setelah autentikasi admin** pada `POST /api/upload`.
- **Honeypot, Turnstile & Zod 4 (`POST /api/auth/login` & `LoginForm.svelte`)**:
  - Menambahkan field honeypot `website` pada `loginSchema` (`zod@4.6.7`), `<input id="login-website" name="website">` tersembunyi CSS (`left: -9999px`, `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`), dan silent `200` di endpoint saat terisi tanpa memicu rate limiter, Turnstile, maupun query autentikasi.
  - Urutan proteksi di `POST /api/auth/login`: origin guard -> JSON parse -> honeypot `website` -> rate limit `rl:desa-pendil:login` -> validasi `loginSchema` -> `verifyTurnstile` -> verifikasi password + set session cookie -> reset rate limit.
- **Paket Terpasang**: Tetap memakai `zod@4.6.7` dan `@neondatabase/serverless@1.2.1` (tanpa menambah `@upstash/*`, paket `rate-limit.ts` + `rate_limits` PostgreSQL sudah tersedia).
- **Rekomendasi Vercel Hobby WAF (1 rule gratis)**: Terapkan rate limit rule di Vercel Firewall untuk `POST /api/auth/login` (mis. `30 req / 60s` per IP) sebagai lapisan perimeter di depan aplikasi.
