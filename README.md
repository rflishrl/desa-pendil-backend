# Desa Pendil Backend

API dan panel admin untuk website Desa Pendil (`desa-pendil`). Mengelola berita, artikel, postingan, dan galeri foto.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui, TanStack Query, react-hook-form + Zod, Supabase (Postgres, Auth, RLS), Vercel Blob untuk foto, Vitest.

## Alur data

```
browser -> frontend (desa-pendil) -> backend API -> Supabase
                                       foto: Vercel Blob
```

Kode dibagi per lapisan: `route` -> `service` (aturan dan otorisasi) -> `repository` (query Supabase). `npm run check:boundaries` menjaga agar lapisan tidak saling menembus.

## Jalankan lokal

1. Buat proyek di Supabase, lalu salin `.env.example` ke `.env.local` dan isi nilainya.
2. `npm install`
3. `npm run db:push` untuk menerapkan skema di `supabase/migrations`.
4. `npm run db:types` untuk membuat ulang `src/types/database.ts` setelah skema berubah.
5. `npm run create-admin -- email@contoh.id` untuk membuat akun admin. Peran admin disimpan di `app_metadata.role`.
6. `npm run dev`, lalu buka http://localhost:4000/login.

## API

Semua respons berbentuk `{ success: true, data }` atau `{ success: false, error }`. Daftar mengembalikan `data: { items, pagination }`.

| Metode | Alamat | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/news/v1` | Publik | Berita yang terbit (`?q=&page=&limit=`) |
| GET | `/api/news/v1/{id atau slug}` | Publik | Satu berita |
| GET | `/api/gallery/v1` | Publik | Foto galeri berurutan |
| GET, POST | `/api/admin/articles` | Admin | Daftar dan tambah konten |
| GET, PATCH, DELETE | `/api/admin/articles/{id}` | Admin | Satu konten |
| GET, POST | `/api/admin/gallery` | Admin | Daftar dan tambah foto |
| GET, PATCH, DELETE | `/api/admin/gallery/{id}` | Admin | Satu foto |
| POST | `/api/upload` | Admin | Unggah foto (JPG, PNG, WebP, maks 4 MB) |
| GET | `/api/health` | Publik | Cek database |

## Keamanan

- RLS aktif di semua tabel. Publik hanya membaca konten berstatus `published` dan galeri. Hanya admin yang menulis.
- `SUPABASE_SECRET_KEY` melewati RLS. Dipakai hanya untuk rate limit, cron pembersih foto, dan `create-admin`.
- Tipe file foto diperiksa dari isi file, bukan dari nama.
- Pembatas percobaan login tersimpan di database, jadi berlaku di semua instance.

## Deploy ke Vercel

1. Impor repo ke Vercel.
2. Isi variabel dari `.env.example`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `BLOB_READ_WRITE_TOKEN`, `ALLOWED_ORIGINS`, `FRONTEND_URL`, `REVALIDATE_SECRET`, `CRON_SECRET`.
3. Buat Blob store di Vercel (Storage) dan hubungkan ke project.
4. Isi `API_BASE_URL` di frontend dengan alamat backend, misalnya `https://backend.vercel.app/api`.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server dev di port 4000 |
| `npm run typecheck` | Cek tipe |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run check:boundaries` | Cek batas lapisan |
| `npm run db:push` | Terapkan migrasi ke Supabase |
| `npm run db:types` | Buat ulang tipe database |
| `npm run create-admin` | Buat akun admin |
