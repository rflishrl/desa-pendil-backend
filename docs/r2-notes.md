# Catatan Migrasi Media R2 (`desa-pendil-backend`)

## Konfigurasi Produksi
- **Bucket Cloudflare R2:** `desa-pendil` *(1 bucket tunggal dalam akun bersama)*
- **Custom Domain Publik:** `https://media-dp.raflisahrul.my.id` (`r2.dev` nonaktif)
- **Runtime Vercel:** `bun1.x` (`vercel.json` `bunVersion: "1.x"`, `vite.config.ts` `nitro.vercel.functions.runtime: "bun1.x"`, `package.json` `engines.bun: ">=1.4"`)
- **Format Key DB:**
  - Production (`VERCEL_ENV === "production"`): `<uuid>.webp` (full) & `<uuid>-thumb.webp` (thumb 480 px)
  - Non-production (local / Preview): `dev/<uuid>.webp` & `dev/<uuid>-thumb.webp`
  - Legacy Blob URL (`http(s)://...`): dipertahankan dual-read saat pembacaan

## Daftar Environment Variable
| Variable | Contoh / Nilai | Wajib Saat |
|---|---|---|
| `STORAGE_PROVIDER` | `blob` *(transisi)* / `r2` *(cutover)* | Selalu (default `blob`) |
| `BLOB_READ_WRITE_TOKEN` | Token Blob Vercel | `STORAGE_PROVIDER=blob` & jendela rollback |
| `R2_ACCESS_KEY_ID` | Key ID token scoped `desa-pendil` | `STORAGE_PROVIDER=r2` |
| `R2_SECRET_ACCESS_KEY` | Secret key token scoped `desa-pendil` | `STORAGE_PROVIDER=r2` |
| `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | `STORAGE_PROVIDER=r2` |
| `R2_BUCKET_NAME` | `desa-pendil` | `STORAGE_PROVIDER=r2` |
| `R2_PUBLIC_DOMAIN` | `https://media-dp.raflisahrul.my.id` | Saat `r2` atau baca key R2 |
| `R2_APP_QUOTA_MB` | `2560` | Opsional (default `2560`) |
| `MAX_UPLOAD_MB` | `4` | Opsional (default `4`, maks `4`) |

## Hasil `[VERIFIKASI]`
- **Nitro & Vercel Bun Runtime (`nitro@3.0.261103-rc`):** Terverifikasi pada `.vercel/output/functions/__server.func/.vc-config.json` menghasilkan `"runtime": "bun1.x"` dan menggunakan web entry format. `maxDuration` memakai default Vercel / konfigurasi fungsi (`VercelServerlessFunctionConfig.maxDuration`).
- **Cloudflare R2 & Cache Rule:** Custom domain `media-dp.raflisahrul.my.id` terverifikasi `cf-cache-status: HIT` dan `Cache-Control: max-age=31536000` pada request `GET` ke-2 (perhatikan `HEAD` tidak mengisi edge cache), serta header CORS `Access-Control-Allow-Origin` + `ExposeHeaders: ETag`.
- **`aws4fetch@1.0.20`:** Menggunakan SigV4 `service: "s3"`, `region: "auto"`, URL path-style `https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<bucket>/<key>`.
- **`Bun.Image` (Bun 1.4.4):** Terverifikasi `.metadata()`, `autoOrient: true`, `.resize(w, h, { fit: "inside", withoutEnlargement: true })`, `.webp({ quality })`, `.bytes()`, serta strip EXIF bawaan saat encode ulang.

## Cara Mengganti `R2_PUBLIC_DOMAIN`
1. Sambungkan Custom Domain baru di bucket `desa-pendil` pada Cloudflare R2 dan pastikan termasuk dalam filter Cache Rule + WAF Rate Limiting.
2. Ubah env `R2_PUBLIC_DOMAIN` di Vercel (Production/Preview/Development) tanpa trailing slash.
3. Redeploy backend dan picu revalidasi/purge cache frontend (`POST /api/revalidate`). Tidak perlu migrasi database karena DB hanya menyimpan object key (`<uuid>.webp`).

## Catatan Cache TTL 1 Tahun Saat Hapus Objek
Karena Cloudflare Cache Rule menyetel Edge & Browser TTL = 1 tahun (`public, max-age=31536000, immutable`), `DeleteObject` menghapus file di R2 tetapi salinan cache di edge Cloudflare tetap bertahan sampai TTL habis kecuali di-*Purge Cache* manual dari dashboard Cloudflare. Hal ini aman untuk key UUID yang bersifat immutable.

## Rencana Rollback
1. Ubah environment variable `STORAGE_PROVIDER` di Vercel kembali dari `r2` ke `blob`, lalu redeploy (atau Promote deployment sebelumnya).
2. Dual-read URL (`isLegacyMediaUrl`) menjaga URL Blob lama tetap terbaca normal; data Blob tidak dihapus sampai masa pengamatan selesai.
