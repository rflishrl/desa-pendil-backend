# Catatan Penyimpanan Media R2 (`desa-pendil-backend`)

## Konfigurasi Produksi

- **Bucket Cloudflare R2:** `desa-pendil` _(1 bucket tunggal dalam akun bersama)_
- **Custom Domain Publik:** `https://media-dp.raflisahrul.my.id` (`r2.dev` nonaktif)
- **Runtime Vercel:** `bun1.x` (`vercel.json` `bunVersion: "1.x"`, `vite.config.ts` `nitro.vercel.functions.runtime: "bun1.x"`, `package.json` `engines.bun: ">=1.4"`)
- **Format Key DB:**
  - Production (`VERCEL_ENV === "production"`): `<uuid>.webp` (full) & `<uuid>-thumb.webp` (thumb 480 px)
  - Non-production (local / Preview): `dev/<uuid>.webp` & `dev/<uuid>-thumb.webp`

## Daftar Environment Variable

| Variable               | Contoh / Nilai                                  | Keterangan                       |
| ---------------------- | ----------------------------------------------- | -------------------------------- |
| `R2_ACCESS_KEY_ID`     | Key ID token scoped `desa-pendil`               | Wajib                            |
| `R2_SECRET_ACCESS_KEY` | Secret key token scoped `desa-pendil`           | Wajib                            |
| `R2_ENDPOINT`          | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | Wajib                            |
| `R2_BUCKET_NAME`       | `desa-pendil`                                   | Wajib                            |
| `R2_PUBLIC_DOMAIN`     | `https://media-dp.raflisahrul.my.id`            | Wajib                            |
| `R2_APP_QUOTA_MB`      | `2560`                                          | Opsional (default `2560`)        |
| `MAX_UPLOAD_MB`        | `4`                                             | Opsional (default `4`, maks `4`) |

## Arsitektur Media R2

- **Nitro & Vercel Bun Runtime (`nitro@3.0.261103-rc`):** Terverifikasi pada `.vercel/output/functions/__server.func/.vc-config.json` menghasilkan `"runtime": "bun1.x"` dan menggunakan web entry format. `maxDuration` memakai default Vercel / konfigurasi fungsi (`VercelServerlessFunctionConfig.maxDuration`).
- **Cloudflare R2 & Cache Rule:** Custom domain `media-dp.raflisahrul.my.id` terverifikasi `cf-cache-status: HIT` dan `Cache-Control: max-age=31536000` pada request `GET` ke-2 (perhatikan `HEAD` tidak mengisi edge cache), serta header CORS `Access-Control-Allow-Origin` + `ExposeHeaders: ETag`.
- **`aws4fetch@1.0.20`:** Menggunakan SigV4 `service: "s3"`, `region: "auto"`, URL path-style `https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<bucket>/<key>`.
- **`Bun.Image` (Lokal Bun 1.4.4 & Vercel Bun 1.3.14):** Terverifikasi melalui `POST /api/admin/diagnostics/image` (`hasBunImage: true`, `bunVersion: "1.3.14"`, `outputBytes: 44`), menggunakan `.metadata()`, `autoOrient: true`, `.resize(w, h, { fit: "inside", withoutEnlargement: true })`, `.webp({ quality })`, ladder kualitas full (`80 -> 72 -> 64 -> 56 -> 48`), serta strip EXIF bawaan saat encode ulang.
- **Pipeline Upload (`src/features/uploads/`):**
  - Server (`image-pipeline.ts` & `service.ts`): validasi magic bytes JPEG/PNG/WebP statis (menolak GIF, SVG, AVIF, HEIC, TIFF, WebP animasi via VP8X flag / `ANIM` / `ANMF`, MIME spoofing, serta bom dekompresi > 50 MP), generate dual WebP (`full <= 1920px <= 1 MB`, `thumb <= 480px` quality 78), cek kuota `media_objects` terhadap `R2_APP_QUOTA_MB`, dan upload atomik ke R2 dengan rollback bila `thumb` PUT atau `insertMediaObject` gagal.
  - Klien & Admin UI (`src/lib/image/prepare.ts` & `ImageUploader.tsx`): pre-shrink otomatis bila file > 3.5 MB ke max sisi 2560 px (fallback Safari PNG -> JPEG), progress upload XHR (`<progress>`), metrik penghematan (`tabular-nums`), paste/drag-and-drop/keyboard accessible, dan field aditif `thumbUrl` pada DTO artikel & galeri.
- **Monitoring & Cleanup:**
  - Endpoint `GET /api/admin/storage` (`withApi({ access: "admin" })`): menghitung penggunaan `full + thumb` terhadap `R2_APP_QUOTA_MB` (`Normal < 70%`, `Waspada 70-89%`, `Kritis >= 90%`), komposisi aset (aktif vs orphan dalam grace period 24 jam vs siap dibersihkan), daftar aset terpaginasi, dan konfigurasi non-rahasia langsung dari DB Neon (`media_objects`) tanpa memanggil `ListObjectsV2`.
  - Halaman admin `/admin/storage` (`MediaStorageDashboard.tsx`): menampilkan bilah progres kuota, status, komposisi aset, daftar aset terpaginasi (`loading="lazy"`), serta sidebar **Penyimpanan** di `AdminShell`.
  - Cron `GET /api/cron/cleanup-media` (`vercel.json`): menghapus pasangan `full + thumb` R2 orphan melewati grace period 24 jam via `DeleteObject` + baris DB `media_objects` tanpa `ListObjectsV2`, serta memangkas `rate_limits` kadaluarsa.
  - Rate limit upload (`RATE_LIMITS.upload`, 30 req / 10 menit per IP) terpasang pada `POST /api/upload`.

## Cara Mengganti `R2_PUBLIC_DOMAIN`

1. Sambungkan Custom Domain baru di bucket `desa-pendil` pada Cloudflare R2 dan pastikan termasuk dalam filter Cache Rule + WAF Rate Limiting.
2. Ubah env `R2_PUBLIC_DOMAIN` di Vercel (Production/Preview/Development) tanpa trailing slash.
3. Redeploy backend. Tidak perlu migrasi database karena DB hanya menyimpan object key (`<uuid>.webp`).

## Catatan Cache TTL 1 Tahun Saat Hapus Objek

Karena Cloudflare Cache Rule menyetel Edge & Browser TTL = 1 tahun (`public, max-age=31536000, immutable`), `DeleteObject` menghapus file di R2 tetapi salinan cache di edge Cloudflare tetap bertahan sampai TTL habis kecuali di-_Purge Cache_ manual dari dashboard Cloudflare. Hal ini aman untuk key UUID yang bersifat immutable.
