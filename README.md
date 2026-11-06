# Desa Pendil backend

API and admin panel for the Desa Pendil website. Admins manage news, articles, posts, and gallery photos here, and the public site reads them through the API.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui, TanStack Query, react-hook-form with Zod, Neon PostgreSQL (`@neondatabase/serverless`), self-contained scrypt password hashing and HMAC session auth, Vercel Blob for photos, and Vitest.

## How it fits together

```
browser -> frontend (desa-pendil) -> backend API -> Neon PostgreSQL
                                          photos: Vercel Blob
```

Code is split by layer: route, then service (rules and authorization), then repository (Neon SQL queries). `npm run check:boundaries` fails if one layer reaches past its neighbor.

## Run locally

1. Create a Neon database project at neon.tech and copy your connection string.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URI` and `SESSION_SECRET`.
3. `npm install` (or `bun install`)
4. `npm run db:push` applies `scripts/schema.sql` to your Neon database.
5. `npm run create-admin -- you@example.com` creates an admin account. It prompts for the password in the terminal.
6. `npm run dev`, then open http://localhost:4000/login.

## Environment variables

| Variable                | Purpose                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URI`          | Neon PostgreSQL connection string (`postgresql://...`). Can also use `DATABASE_URL`.    |
| `SESSION_SECRET`        | 64+ character random secret string used to sign HMAC-SHA256 session cookies.            |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token. Photo upload stays off without it. Automatically provided by Vercel. |
| `ALLOWED_ORIGINS`       | Frontend addresses allowed to call the API from a browser (CORS), separated by commas.  |
| `FRONTEND_URL`          | Frontend address, used to refresh its cache after an edit.                              |
| `REVALIDATE_SECRET`     | Shared secret for that refresh call. Must match the frontend.                           |
| `CRON_SECRET`           | Secret for the daily photo cleanup. Vercel sends it automatically.                      |

If `FRONTEND_URL` or `REVALIDATE_SECRET` is empty, instant refresh is off and the frontend picks up changes when its 5 minute cache expires.

## API

Every response is `{ "success": true, "data": ... }` or `{ "success": false, "error": "..." }`. Lists return `data: { items, pagination }`.

| Method             | Path                        | Access | Purpose                                        |
| ------------------ | --------------------------- | ------ | ---------------------------------------------- |
| GET                | `/api/news/v1`              | Public | Published news (`?q=&page=&limit=`)            |
| GET                | `/api/news/v1/{id or slug}` | Public | One news item                                  |
| GET                | `/api/gallery/v1`           | Public | Gallery photos in order                        |
| GET, POST          | `/api/admin/articles`       | Admin  | List and create content                        |
| GET, PATCH, DELETE | `/api/admin/articles/{id}`  | Admin  | One content item                               |
| GET, POST          | `/api/admin/gallery`        | Admin  | List and add photos                            |
| GET, PATCH, DELETE | `/api/admin/gallery/{id}`   | Admin  | One photo                                      |
| POST               | `/api/upload`               | Admin  | Upload a photo (JPG, PNG, or WebP, up to 4 MB) |
| GET                | `/api/health`               | Public | Database check                                 |

News, articles, and posts share one table. Only published items of type `berita` appear in the public API.

## Security

- Database access uses `@neondatabase/serverless` over HTTPS with prepared SQL statements.
- Passwords are encrypted with Node.js native `crypto.scrypt` with unique per-user salts.
- Admin sessions use tamper-proof HMAC-SHA256 tokens stored in `httpOnly`, `sameSite=lax`, `secure` cookies.
- Upload type is verified from the file's binary magic bytes, not its file name or extension.
- Login attempts are rate limited per IP using database-backed records in PostgreSQL.
- State-changing write requests require matching origin headers to prevent CSRF.

## Deploy to Vercel

1. Import the repository or link your existing Vercel project.
2. Add `DATABASE_URI` and `SESSION_SECRET` to the Production environment variables.
3. Under Storage, connect a Vercel Blob store (provides `BLOB_READ_WRITE_TOKEN`).
4. Run `npm run db:push` once locally or via CI to create tables in Neon.
5. Deploy, then open `/api/health`. It should return `"status":"ok"`.

## Scripts

| Command                    | Purpose                       |
| -------------------------- | ----------------------------- |
| `npm run dev`              | Dev server on port 4000       |
| `npm run typecheck`        | Type check                    |
| `npm run lint`             | ESLint                        |
| `npm run test`             | Vitest                        |
| `npm run check:boundaries` | Layer boundary check          |
| `npm run db:push`          | Apply schema to Neon database |
| `npm run create-admin`     | Create an admin account       |
