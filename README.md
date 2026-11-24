# OpenPaddy PoC

Trust-First Orchestration Platform PoC for UTC Startup 2027.

## Monorepo Structure

- `apps/web` (`@openpaddy/web`): Next.js 15 App Router frontend
- `packages/db` (`@openpaddy/db`): Drizzle ORM schema, migrations, and seed scripts for Cloudflare D1 (SQLite)
- `packages/shared` (`@openpaddy/shared`): Shared Zod schemas, TypeScript types, and constants
- `workers/api` (`@openpaddy/api`): Hono 4.x backend on Cloudflare Workers

## Prerequisites

- Node.js >= 20
- pnpm >= 9

## Setup

```bash
pnpm install
pnpm lint
pnpm typecheck
```
