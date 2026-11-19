# Desa Pendil Backend

API service and administrative panel for the Desa Pendil website. Administrators manage news, articles, announcements, and photo galleries here, while the public frontend consumes them via the REST API.

Built with **SvelteKit 3**, **Svelte 5 (Runes)**, **Vite 8**, **TypeScript 6**, **Tailwind CSS 4**, **Zod 4**, **Neon PostgreSQL** (`@neondatabase/serverless`), scrypt password hashing + HMAC-SHA256 session cookies, **Cloudflare Turnstile** bot defense, **Cloudflare R2** (`aws4fetch` + **`sharp`** WebP pipeline), and **@sveltejs/adapter-vercel** (`nodejs24.x`).

---

## Tech Stack

- **Framework**: SvelteKit 3 (`@sveltejs/kit` 3.2.x) + `@sveltejs/adapter-vercel` 7.x (`nodejs24.x`)
- **UI**: Svelte 5 (Runes), Tailwind CSS 4 (`@tailwindcss/vite`), `@lucide/svelte`
- **Bundler**: Vite 8
- **Package Manager**: Bun (`bun.lock`)
- **Runtime (Production / Vercel)**: Node.js 24 LTS (`>= 22.17`)
- **Database**: Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- **Validation**: Zod 4
- **Bot Defense**: Cloudflare Turnstile (native explicit widget + server-side `siteverify` with single-use replay guard)
- **Auth & Security**: HMAC-SHA256 signed `HttpOnly` session cookies, `crypto.scrypt` password hashing, PostgreSQL-backed rate limiting, same-origin CSRF verification
- **Media Storage**: Cloudflare R2 (`aws4fetch` + `sharp` dual-size WebP pipeline, quota guard on Neon `media_objects`, daily orphan cleanup cron)
- **Code Hygiene**: ESLint + Prettier + `svelte-check` + `check:boundaries`
- **Testing**: Vitest 5 + Playwright

---

## Project Structure

```text
src/
├── app.html                          # Document shell, dark-mode init, noindex meta
├── app.d.ts                          # App.Locals & Window.turnstile ambient types
├── env.ts                            # SvelteKit 3 defineEnvVars() declarations
├── hooks.server.ts                   # Session cookie resolution into event.locals.admin
├── styles/globals.css                # Tailwind CSS 4 theme & dark-mode tokens
├── lib/
│   ├── api/                          # Client BFF helper & ApiResponse / Paginated types
│   ├── components/
│   │   ├── admin-kit/                # AdminShell, CopyButton, DeleteDialog, PaginationNav, SearchForm, ThemeToggle, Thumb
│   │   ├── ui/                       # Button & Toaster primitives
│   │   └── TurnstileField.svelte     # Native Cloudflare Turnstile explicit widget
│   ├── features/                     # Shared Zod schemas & Svelte 5 UI components (auth, articles, gallery, uploads)
│   ├── image/prepare.ts              # Client-side image pre-shrink helper prior to upload
│   ├── schemas/common.ts             # Shared Zod text, media key, and pagination schemas
│   ├── storage/media-key.ts          # Client-safe canonical R2 key & URL helpers
│   ├── stores/toast.svelte.ts        # Runes-based toast notification store
│   └── server/                       # Server-only modules (never imported by client)
│       ├── api/                      # withApi() wrapper, AppError, CSRF & PostgreSQL rate limiter
│       ├── auth/                     # Actor, assertAdmin, scrypt password, HMAC session cookies
│       ├── db/client.ts              # Neon serverless SQL client
│       ├── features/                 # Repositories & services (auth, articles, gallery, dashboard, health, uploads/sharp)
│       ├── storage/                  # Cloudflare R2 S3 client (aws4fetch) & server media URL normalization
│       ├── env.ts                    # Validated server env via $app/env/private
│       ├── revalidate.ts             # Frontend cache revalidation webhook dispatcher
│       └── turnstile.ts              # Server-side Cloudflare Turnstile verification
└── routes/
    ├── +layout.svelte                # Root shell, fonts, skip link, Toaster
    ├── +error.svelte                 # Custom 404 & error page
    ├── +page.server.ts               # Root redirect (/admin or /login)
    ├── login/                        # Admin login page
    ├── admin/                        # Protected admin layout, dashboard, storage, articles & gallery CRUD
    └── api/                          # 14 REST endpoints wrapped in withApi()
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (`>= 1.4`)
- [Node.js](https://nodejs.org) (`>= 22.17`, Node 24 LTS recommended for parity with Vercel)
- Neon PostgreSQL database, Cloudflare R2 bucket (`desa-pendil`), and Cloudflare Turnstile keys

### Setup

```bash
bun install
copy .env.example .env.local   # or: cp .env.example .env.local
bun run db:push
bun run create-admin -- admin@desapendil.com
bun run dev
```

Development server starts at `http://localhost:4000` (admin panel at `/login`).

---

## Environment Variables

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `DATABASE_URI` | Private | Neon PostgreSQL connection string (`DATABASE_URL` / `POSTGRES_URL` fallbacks supported) |
| `SESSION_SECRET` | Private | Secret (min 32 chars, required in production) for HMAC-SHA256 `admin_session` cookie |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_PUBLIC_DOMAIN` | Private | Cloudflare R2 bucket credentials & custom domain (`https://media-dp.raflisahrul.my.id`) |
| `R2_APP_QUOTA_MB`, `MAX_UPLOAD_MB` | Private | Quota guard in MiB (default `2560`) and max upload size in MiB (default/max `4`) |
| `ALLOWED_ORIGINS` | Private | Comma-separated frontend origins allowed via CORS |
| `FRONTEND_URL`, `REVALIDATE_SECRET` | Private | Frontend URL & shared secret for `POST /api/revalidate` |
| `CRON_SECRET` | Private | Bearer secret for Vercel Cron `GET /api/cron/cleanup-media` |
| `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` | Private | Server-side Turnstile siteverify secret & allowed hostnames |
| `PUBLIC_TURNSTILE_SITE_KEY` | Public (`static: true`) | Client Turnstile site key (replaces legacy `VITE_TURNSTILE_SITE_KEY`) |

> **Vercel Deployment Note**: Set Node.js Version to **24.x** in Vercel Project Settings (`Settings -> General -> Node.js Version`) and rename `VITE_TURNSTILE_SITE_KEY` to `PUBLIC_TURNSTILE_SITE_KEY` before deploying.

---

## Available Scripts

| Command | Action |
| :--- | :--- |
| `bun run dev` | Starts Vite dev server on port 4000 |
| `bun run build` | Builds SvelteKit 3 production bundle via `@sveltejs/adapter-vercel` (`nodejs24.x`) |
| `bun run preview` | Previews production build on port 4000 |
| `bun run check` | Runs `svelte-kit sync` and `svelte-check` |
| `bun run check:boundaries` | Enforces client/server & API wrapper architecture boundaries |
| `bun run lint` | Runs Prettier check and ESLint |
| `bun run format` | Formats all files with Prettier |
| `bun run test` | Runs Vitest unit/integration tests |
| `bun run test:e2e` | Runs Playwright E2E tests |
| `bun run db:push` | Applies `scripts/schema.sql` to Neon PostgreSQL |
| `bun run create-admin` | Creates/updates an admin user in Neon PostgreSQL |
