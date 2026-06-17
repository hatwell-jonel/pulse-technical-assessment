<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pulse — repo guide

## Commands
- **dev**: `npm run dev`
- **build**: `npm run build` (runs `npx prisma generate && next build`)
- **lint**: `npm run lint` (ESLint 9 flat config at `eslint.config.mjs`)
- **typecheck**: none (no `tsc` script — `strict: true` in tsconfig but no CI gate)
- **test**: none (no test framework in deps, no test files)
- **setup**: copy `.env.example` to `.env`, then `npx prisma db push` to create tables
- **DB migration**: `npx prisma migrate dev`

## Architecture
- **Single Next.js 16 App Router** project (no monorepo). `app/` is entrypoint; root page is `app/page.tsx` ("use client").
- **Server = coordination only** (HTTP polling, no WebSockets). API routes at `app/api/{join,leave,poll,signal}/route.ts` — all `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- **Chat/video = WebRTC P2P** (data channel + media). Never touch the server. STUN-only (no TURN).
- **Poll cadence**: 1.5s client interval (`POLL_INTERVAL_MS`), 15s stale timeout (`STALE_MS`). Tab close uses `navigator.sendBeacon` to POST `/api/leave`.
- **Prisma 7** with `@prisma/adapter-pg` (driver adapter). Config is in `prisma.config.ts` (not schema), uses `process.loadEnvFile()` to load `.env`.

## Conventions
- Path alias: `@/*` maps to project root (e.g. `@/lib/prisma`, `@/lib/types`)
- Tailwind v4: `@import "tailwindcss"` + `@theme inline` directive (not `@tailwind` directives)
- All API route files export `runtime` and `dynamic` as first declarations
- Types shared between client/server live in `lib/types.ts`
- Cleanup on disconnect deletes Presence + Signal rows independently (no transactions over PgBouncer)
- Connected clients heartbeat on every poll tick (all rows updated; stale-only delete reaps offline)
