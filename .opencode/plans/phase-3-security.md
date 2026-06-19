# Phase 3 — Security Fix Implementation Plan

## Changes overview

### 1. `lib/auth.ts` — HMAC session token helpers + `isAuthEnabled()`
- Read `SERVER_SECRET` from env (optional — if missing, `SECRET` is `""`)
- `signSession(id: string): string` — returns `HMAC-SHA256(secret, id).substring(0, 16)`
- `verifySession(id: string, token: string): boolean` — constant-time compare
- `isAuthEnabled(): boolean` — returns `SECRET.length > 0`; all route guards check this before rejecting requests
- Token is stateless, no DB needed
- Auth is fully optional — routes only enforce it when `SERVER_SECRET` is set

### 2. `lib/rate-limit.ts` (new) — Simple in-memory sliding window
- `rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number }`
- Uses `Map<string, number[]>` indexed by `${method}:${path}:${ip}`
- Cleans expired entries on each call
- Default: 30 req/min per endpoint per IP (generous for 1.5s poll cadence)

### 3. `app/api/join/route.ts` — Return session token (if auth enabled)
- After upsert, compute `token = signSession(id)`
- Return `{ ok: true, ...(isAuthEnabled() ? { token: signSession(id) } : {}) }`
- Client stores token → sends as `X-Session-Token` header

### 4. `app/api/poll/route.ts` — Auth + rate limit + id validation
- Add rate limit check: `rateLimit("poll", 40, 60_000)` 
- Validate id length: `typeof id !== "string" || id.length < 8 || id.length > 64`
- Read `X-Session-Token` header, verify with `verifySession(id, token)` if `isAuthEnabled()`
- Return 403 if invalid (only when auth is enabled)

### 5. `app/api/signal/route.ts` — Auth + rate limit
- Add rate limit check: `rateLimit("signal", 30, 60_000)`
- Verify `fromId` matches the token via `verifySession(fromId, token)` if `isAuthEnabled()`
- Prevents sending signals impersonating other users

### 6. `app/api/leave/route.ts` — Auth + rate limit + id validation
- Add rate limit check
- Validate id length
- Verify `id` matches token (from header or body) if `isAuthEnabled()`

### 7. `lib/api.ts` — Send token on all requests
- On join success, capture `token` from response body
- Store token in module-level variable
- Add `X-Session-Token` header to all poll/signal/leave requests

### 8. `next.config.ts` — Remove ngrok + add HSTS/CSP
- Remove `allowedDevOrigins` line
- Add `headers()` async function for `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`

### 9. `NOTES.md` — Phase 3 section

## Order of implementation
1. `lib/auth.ts` — foundational
2. `lib/rate-limit.ts` — foundational
3. `app/api/join/route.ts` — return token
4. `app/api/poll/route.ts` — auth + rate limit + id validation
5. `app/api/signal/route.ts` — auth + rate limit
6. `app/api/leave/route.ts` — auth + rate limit + id validation
7. `lib/api.ts` — send token on client side
8. `next.config.ts` — security headers + remove ngrok
9. `NOTES.md` — document Phase 3
