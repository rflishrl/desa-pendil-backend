# Desa Pendil Backend

API dan panel admin untuk website Desa Pendil. Mengelola berita, artikel, postingan, dan galeri.

Next.js 15 · TypeScript · PostgreSQL + Drizzle ORM · Tailwind · Vercel Blob · Docker Compose

## Jalankan lokal

```bash
cp .env.example .env          # isi POSTGRES_PASSWORD, DATABASE_URL, AUTH_SECRET, ADMIN_PASSWORD
docker compose up -d db       # PostgreSQL 17 di 127.0.0.1:5432
npm install
npm run db:migrate            # buat tabel
npm run db:seed               # buat admin pertama dari ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                   # http://localhost:4000  (admin: /admin)
```

Tanpa `BLOB_READ_WRITE_TOKEN`, gambar disimpan di `.uploads/` dan dilayani lewat `/uploads/...`.

## Semua di Docker

```bash
docker compose --profile app up --build -d                  # db -> migrate -> app
docker compose --profile app run --rm migrate npm run db:seed
```

Database hanya dibuka ke `127.0.0.1`. Image app berjalan sebagai user non-root. Upload tersimpan di volume `uploads`.

## Deploy ke Vercel

1. Buat database PostgreSQL (Neon lewat Vercel Marketplace) dan Blob store; hubungkan ke project.
2. Set env: `DATABASE_URL` (pooled), `AUTH_SECRET`, `FRONTEND_ORIGINS`, `PUBLIC_BASE_URL`, `BLOB_READ_WRITE_TOKEN`.
3. Jalankan migrasi dan seed sekali dari komputer Anda: `DATABASE_URL=... npm run db:migrate && npm run db:seed`.
4. Deploy. Di frontend set `API_BASE_URL=https://<backend>/v1`.

## API

Publik (untuk frontend):

| Endpoint | Keterangan |
| --- | --- |
| `GET /v1/news?page=&limit=&q=` | Berita terbit. Bentuk sama dengan API lama: `{ data: [{ id, judul, isi, author, thumbnail, createdAt }] }` |
| `GET /v1/news/:idOrSlug` | Satu berita |
| `GET /v1/gallery` | `{ data: [{ id, src, alt, caption }] }` |
| `GET /api/health` | Cek aplikasi dan database |

Admin (butuh cookie sesi dari login `/admin`):

| Endpoint | Keterangan |
| --- | --- |
| `GET/POST /api/v1/articles` | Daftar (semua status untuk admin) / buat |
| `GET/PATCH/DELETE /api/v1/articles/:id` | Baca / ubah / hapus |
| `POST /api/v1/media` | Upload gambar (`multipart`, field `file`, `folder`) |
| `GET/POST /api/v1/gallery`, `PATCH/DELETE /api/v1/gallery/:id` | Kelola galeri |

`type` artikel: `berita`, `artikel`, `postingan`. `status`: `draft`, `published`.
Konten dengan `publishedAt` di masa depan baru tampil setelah waktunya tiba.

## Keamanan

- Password di-hash dengan scrypt; sesi JWT (HS256) di cookie `httpOnly`, `SameSite=Lax`, `Secure` di produksi.
- Login dibatasi 5 percobaan per 15 menit per IP+email (memori per instance; di Vercel tambahkan Firewall rate limit).
- Upload: maks. 4 MB (batas body Vercel 4,5 MB), hanya JPG/PNG/WebP, tipe dicek dari byte file.
- Semua input divalidasi dengan zod; query memakai parameter (Drizzle).

## Perintah

`npm run typecheck` · `npm run lint` · `npm run build` · `npm run test:smoke` (uji end-to-end memakai PostgreSQL in-memory, tanpa Docker)
