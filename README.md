# Desa Pendil Backend

Backend API and Content Management System for the Desa Pendil public portal website ([desa-pendil.vercel.app](https://desa-pendil.vercel.app/)).

Built with [Next.js 16](https://nextjs.org/) (App Router), [Payload CMS v3](https://payloadcms.com/), [PostgreSQL (Neon)](https://neon.tech/), [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) object storage, and [Bun](https://bun.sh/).

---

## Architecture Overview

- **CMS Framework**: Payload CMS v3 embedded natively within Next.js App Router (`/admin`).
- **Database**: Serverless PostgreSQL hosted on Neon via `@payloadcms/db-postgres`.
- **Media Storage**: S3-compatible Cloudflare R2 storage via `@payloadcms/storage-s3`.
- **Image Optimization**: Automated server-side compression using `Bun.Image` (with `Sharp` fallback), optimizing uploads to WebP (quality 85, max 2560px).
- **Rich Text Editor**: Lexical editor (`@payloadcms/richtext-lexical`).
- **Runtime**: Bun 1.4+.

```
Public Website (desa-pendil.vercel.app)
       │
       ▼ (REST / GraphQL)
Next.js Backend (/api/*, /admin)
  ├── Neon PostgreSQL (Database records & auth)
  └── Cloudflare R2 (Media assets & uploads)
```

---

## Collections

- **News (`news`)**: Village news articles with slug generation, publication dates, and Lexical rich-text content.
- **Announcements (`announcements`)**: Public notices and announcements.
- **Village Officials (`village-officials`)**: Profiles and organizational structure of village leadership.
- **Services (`services`)**: Public service guides, requirements, and procedures for residents.
- **Media (`media`)**: Image assets stored in Cloudflare R2 with automatic WebP compression.
- **Users (`users`)**: Authenticated administrative accounts.

---

## Getting Started Locally

### Prerequisites

- [Bun](https://bun.sh/) (v1.2+) installed on your machine.
- A Neon PostgreSQL database instance.
- A Cloudflare R2 bucket and API token.

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/rflishrl/desa-pendil-backend.git
cd desa-pendil-backend
bun install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your credentials in `.env.local`:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URI` | Neon PostgreSQL pooled connection string (`postgresql://...@...pooler.../neondb?sslmode=require`) |
| `PAYLOAD_SECRET` | Secret key for JWT hashing (`openssl rand -hex 32`) |
| `R2_BUCKET` | Cloudflare R2 bucket name (`desa-pendil-media`) |
| `R2_ENDPOINT` | Cloudflare R2 S3 API URL (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 API token Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API token Secret Access Key |
| `SERVER_URL` | Base application URL (`http://localhost:4000`) |

### 3. Run Development Server

```bash
bun run dev
```

The application runs on `http://localhost:4000`.
- Admin Panel: `http://localhost:4000/admin`
- REST API: `http://localhost:4000/api`
- GraphQL API: `http://localhost:4000/api/graphql`

On first visit to `/admin`, create your initial administrative account.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `bun run dev` | Starts local Next.js development server on port 4000 |
| `bun run build` | Compiles production build |
| `bun run start` | Starts compiled production server on port 4000 |
| `bun run lint` | Runs ESLint checks |
| `bun run typecheck` | Runs TypeScript compiler checks |
| `bun run check:boundaries` | Verifies architectural boundary rules |
| `bun run generate:types` | Regenerates Payload TypeScript types (`src/payload-types.ts`) |
| `bun run generate:importmap` | Regenerates Payload component import map |

---

## Deployment to Vercel

1. Import the repository into your Vercel account.
2. In **Project Settings** > **Environment Variables**, configure all variables from `.env.example`.
   - Ensure `DATABASE_URI` uses the **pooled** connection string (containing `-pooler` in the host).
   - Set `SERVER_URL` to your production Vercel domain (e.g. `https://desa-pendil-backend.vercel.app`).
3. Deploy. Vercel automatically detects Bun and executes `bun install` followed by `bun run build`.
