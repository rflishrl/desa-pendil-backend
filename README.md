# Desa Pendil Backend

API service and administrative panel for the Desa Pendil website. Administrators manage news, articles, announcements, and photo galleries here, while the public frontend consumes them via the REST API.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query 5, react-hook-form with Zod, Neon PostgreSQL (`@neondatabase/serverless`), self-contained scrypt password hashing and HMAC-SHA256 session auth, Vercel Blob for media storage, and Vitest.

## System Architecture

```
Browser -> Frontend (desa-pendil) -> Backend API -> Neon PostgreSQL
                                           Photos: Vercel Blob
```

The codebase is strictly layered:

- **Route handlers** (`src/app/api/**/route.ts`): Thin entry points wrapped with `withApi()`.
- **Services** (`src/features/**/service.ts`): Business rules, data transformation, and authorization checks.
- **Repositories** (`src/features/**/repository.ts`): The only layer permitted to query Neon PostgreSQL.

Layer boundaries are enforced by `npm run check:boundaries`. Client-side components cannot import server-only modules or make external fetch calls.

## Getting Started

### 1. Prerequisites

- Node.js >= 22 (or Bun >= 1.4)
- A Neon PostgreSQL database project ([neon.tech](https://neon.tech))
- A Vercel Blob storage store (optional for local dev, required for photo uploads)

### 2. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
# Windows
copy .env.example .env.local

# macOS / Linux
cp .env.example .env.local
```

Fill in `.env.local` with your configuration:

| Variable                | Description                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URI`          | Neon PostgreSQL connection string (`postgresql://...`). Supports `DATABASE_URL` or `POSTGRES_URL` as fallbacks. |
| `SESSION_SECRET`        | 64+ character random secret string used to sign HMAC-SHA256 session cookies.                                    |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for photo uploads. Automatically provided in Vercel deployments.                              |
| `ALLOWED_ORIGINS`       | Comma-separated list of allowed frontend origins for CORS.                                                      |
| `FRONTEND_URL`          | Public frontend URL. The backend triggers on-demand revalidation here on content updates.                       |
| `REVALIDATE_SECRET`     | Shared secret token for frontend cache revalidation.                                                            |
| `CRON_SECRET`           | Secret token used by Vercel Cron to trigger daily orphaned blob cleanup.                                        |

Generate a secure random session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Install Dependencies

```bash
npm install
# or
bun install
```

### 4. Push Database Schema

Apply `scripts/schema.sql` to your Neon PostgreSQL database:

```bash
npm run db:push
```

### 5. Create Admin Account

Register your admin credentials in Neon PostgreSQL:

```bash
npm run create-admin -- admin@desapendil.com
```

You will be prompted to enter a password (minimum 8 characters).

### 6. Start Development Server

```bash
npm run dev
```

The development server starts at `http://localhost:4000`. Access the admin panel at `http://localhost:4000/login`.

## API Endpoints

All API responses follow a uniform JSON envelope: `{ "success": true, "data": ... }` or `{ "success": false, "error": "..." }`. Paginated listing endpoints return `data: { items, pagination }`.

| Method             | Path                        | Access | Description                                       |
| ------------------ | --------------------------- | ------ | ------------------------------------------------- |
| GET                | `/api/news/v1`              | Public | List published news articles (`?q=&page=&limit=`) |
| GET                | `/api/news/v1/{id or slug}` | Public | Retrieve a single news article by ID or slug      |
| GET                | `/api/gallery/v1`           | Public | List photo gallery items in display order         |
| GET, POST          | `/api/admin/articles`       | Admin  | List all content items or create a new article    |
| GET, PATCH, DELETE | `/api/admin/articles/{id}`  | Admin  | Retrieve, update, or delete a content item        |
| GET, POST          | `/api/admin/gallery`        | Admin  | List all gallery photos or add a new photo        |
| GET, PATCH, DELETE | `/api/admin/gallery/{id}`   | Admin  | Retrieve, update, or delete a gallery photo       |
| POST               | `/api/upload`               | Admin  | Upload an image (JPG, PNG, or WebP, up to 4 MB)   |
| GET                | `/api/health`               | Public | Service health and database connectivity check    |

News, articles, and posts share one table. Only published items of type `berita` (news) appear in the public API.

## Security

- Database access uses `@neondatabase/serverless` over HTTPS with prepared SQL queries.
- Passwords are encrypted using native Node.js `crypto.scrypt` with unique 16-byte random salts.
- Admin sessions use HMAC-SHA256 tokens stored in `httpOnly`, `sameSite=lax`, `secure` cookies valid for 7 days.
- Uploads are validated against binary magic bytes to prevent MIME-type spoofing.
- Login endpoints enforce database-backed IP rate limiting (8 attempts per 10-minute window).
- State-changing write requests enforce strict same-origin checks to defend against CSRF attacks.

## Deployment to Vercel

1. Import the repository into Vercel. Next.js will be detected automatically.
2. In Project Settings > Environment Variables, set `DATABASE_URI` (or connect Neon via Vercel Marketplace) and `SESSION_SECRET`.
3. In Project Settings > Storage, create or connect a Vercel Blob store (automatically sets `BLOB_READ_WRITE_TOKEN`).
4. Run `npm run db:push` once locally or in CI to ensure all tables exist in Neon.
5. Deploy the application, then verify `https://<your-deployment>.vercel.app/api/health`.

## Available Scripts

| Command                    | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `npm run dev`              | Start development server on port 4000             |
| `npm run build`            | Build optimized production bundle                 |
| `npm run start`            | Start production server on port 4000              |
| `npm run typecheck`        | Run TypeScript type checks without emitting files |
| `npm run lint`             | Run ESLint checks                                 |
| `npm run test`             | Run Vitest unit and integration test suite        |
| `npm run format`           | Format code using Prettier                        |
| `npm run format:check`     | Check code formatting with Prettier               |
| `npm run check:boundaries` | Enforce clean architectural boundary rules        |
| `npm run db:push`          | Apply database schema to Neon PostgreSQL          |
| `npm run create-admin`     | Create or update an admin user account in Neon    |
