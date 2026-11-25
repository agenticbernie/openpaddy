# OpenPaddy PoC (UTC Startup 2027)

**OpenPaddy** is a Trust-First Orchestration Platform PoC validating that rice export enterprises will adopt a compliance-data-driven orchestration platform to reduce contract breaches and post-harvest losses, even when field data is manually entered.

## Architecture & Tech Stack

- **Frontend (`apps/web`):** Next.js 15 (App Router), Tailwind CSS, shadcn/ui, Zustand 5, React Query, React Hook Form + Zod, MapLibre GL JS + `react-map-gl` + `@turf/turf`, `@react-pdf/renderer` + `qrcode`
- **Backend (`workers/api`):** Hono 4.x on Cloudflare Workers, `jose` JWT auth, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (vendor-neutral S3-compatible R2)
- **Database (`packages/db`):** Drizzle ORM (SQLite dialect) on Cloudflare D1
- **Shared (`packages/shared`):** Single-source-of-truth Zod schemas, inferred TypeScript types, domain constants
- **Tooling:** pnpm workspaces, Biome (lint/format), Vitest, Playwright

## Prerequisites

- Node.js >= 20
- pnpm >= 9

## Local Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Apply local D1 database migrations:
   ```bash
   printf 'y\n' | pnpm --filter @openpaddy/api exec wrangler d1 migrations apply openpaddy-db --local
   ```

3. Start the Workers API (`http://127.0.0.1:8787`) and Next.js frontend (`http://127.0.0.1:3000`):
   ```bash
   pnpm --filter @openpaddy/api dev
   pnpm --filter @openpaddy/web dev
   ```

4. Seed realistic Cần Thơ demo data:
   - Log in at `http://127.0.0.1:3000/login`
   - Go to **Tài khoản** (`/profile`) and click **Nạp dữ liệu mẫu Cần Thơ (Demo)**, or run:
     ```bash
     curl -X POST http://127.0.0.1:8787/api/dev/seed
     ```

## Demo Credentials

- **Username:** `admin`
- **Password:** `openpaddy2027`

## Verification Commands

```bash
pnpm lint
pnpm typecheck
pnpm --filter @openpaddy/shared test
pnpm --filter @openpaddy/api test
pnpm build
```

## Known PoC Limitations

- Single-tenant mock authentication (`admin` / `openpaddy2027`) with `jose` HS256 JWT; no OAuth or multi-tenancy.
- Satellite & AI verification is a UI placeholder ("Coming Soon")—out of scope for PoC validation.
- R2 presigned URLs work out of the box with S3-compatible signing; configure `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_ENDPOINT` secrets in production for live R2 object uploads.
- Dashboard auto-refresh uses 30-second polling (`setInterval`) instead of WebSockets.

## Deployment (Cloudflare)

1. **Workers API + D1 + R2:**
   ```bash
   pnpm --filter @openpaddy/api exec wrangler d1 migrations apply openpaddy-db --remote
   pnpm --filter @openpaddy/api exec wrangler deploy
   ```
2. **Next.js Frontend on Cloudflare Pages:**
   ```bash
   NEXT_PUBLIC_API_URL=https://your-worker-url.workers.dev pnpm --filter @openpaddy/web pages:build
   ```
