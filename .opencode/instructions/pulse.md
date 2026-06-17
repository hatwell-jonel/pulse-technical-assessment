# Pulse — assessment workflow

## Before any code
- Read `AGENTS.md` — contains critical repo-specific facts
- Read `docs/requirements.md` for business requirements
- Consult `node_modules/next/dist/docs/` — Next.js 16 has breaking changes

## Phase workflow

**Phase 1 (bugs):** Investigate before fixing. Read all API route files in `app/api/*/route.ts`, the poll/signal logic in `app/page.tsx`, and `lib/webrtc.ts`. Look for logic errors, missing awaits, incorrect parameters, stale state, and race conditions. Commit after each bug fix.

**Phase 2 (UI/UX):** No mockup — use creative judgment. Extend `@theme inline` in `globals.css` for a design system. Animate entry/exit states. Polish loading, empty, and error states.

**Phase 3 (security):** Audit every route handler for input validation, rate limiting, session spoofing, information disclosure, and race conditions. Fix what's feasible, document the rest.

**Phase 4 (feature):** Build something that makes Pulse feel "more alive and/or safe." Ship working, document trade-offs in NOTES.md.

## Common traps
- `npm run build` runs `npx prisma generate && next build` — not just `next build`
- No `tsc` script exists; `strict: true` in tsconfig but not CI-gated
- No test framework at all — don't try to run tests
- API routes must export `runtime = "nodejs"` and `dynamic = "force-dynamic"`
- Path alias `@/*` maps to project root, not `src/`
- Tailwind v4 uses `@import "tailwindcss"` + `@theme inline`, not `@tailwind` directives
- Prisma 7 config is in `prisma.config.ts`, not in `schema.prisma`
- `.env` is loaded via `process.loadEnvFile()` in `prisma.config.ts`

## Deliverables
- Public GitHub repo with meaningful incremental commits
- Vercel deployment with env vars set
- `NOTES.md` at root — one section per phase (bullet points)
