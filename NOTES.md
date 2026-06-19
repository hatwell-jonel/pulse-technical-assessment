# Pulse — Notes

- **Repo:** https://github.com/hatwell-jonel/pulse-technical-assessment
- **Live:** https://pulse-technical-assessment-flax.vercel.app/

## Phase 0 — Setup

- Copied `.env.example` to `.env`
- Provisioned a free Neon Postgres database and set `DATABASE_URL`
- Generated a free Mapbox token and set `NEXT_PUBLIC_MAPBOX_TOKEN`
- Ran `npx prisma db push` to create `Presence` and `Signal` tables
- Confirmed app starts at `localhost:3000`
- Tested with two browser windows (normal + incognito) with mock geolocations via DevTools Sensors

## Phase 1 — Bug fixes

### Bug 1 — `join()` ignores API errors
**Symptom:** User clicks "Enter", location is obtained, but the join POST fails silently. No presence row is created, so no peers ever appear on the map. User enters the live view with "0 online" and no dots.

**Root cause:** `lib/api.ts:join()` called `await fetch(...)` but never checked `res.ok`. Any server error (invalid data, DB failure, etc.) was silently ignored. The caller (`handleReady`) would call `setPhase("live")` regardless.

**Fix:** Added response checking — if `res.ok` is false, parse the body for an error message and throw. Added try/catch in `handleReady` to show the error via `showNotice`.

### Bug 2 — Poll errors silently swallowed
**Symptom:** If the poll API returns errors (network issues, DB failures), the `catch {}` swallowed them completely. The UI never updates — stays at whatever the last successful response was (usually an empty peer list).

**Root cause:** `app/page.tsx:282-285` had an empty `catch {}` block that discarded all errors.

**Fix:** Replaced `catch {}` with `catch (e) { console.error(...) }` so errors surface in the browser console.

### Bug 3 — Heartbeat updates ALL presence rows instead of just the caller's
**Symptom:** Online users' dots persist on the map long after they've closed the tab. This is the bug described in the README example.

**Root cause:** `app/api/poll/route.ts:25-28` used `where: {}` in `prisma.presence.updateMany()`, which updated every row's `lastSeen` to the current time. Since every polling user refreshed everyone's timestamp, the stale reaper (`deleteMany` with `lastSeen < staleCutoff`) never found any stale rows.

**Fix:** Changed `where: {}` to `where: { id }` so only the caller's row gets its heartbeat updated. Each user is now responsible for their own freshness, and the stale reaper correctly removes disconnected users.

### Bug 4 — "end" signal doesn't clear `busy` flag
**Symptom:** After a connection ends, both users remain `busy: true`, blocking any future connection attempts. Trying to connect to a previously-connected user silently fails (auto-declined by the server), making the app feel like it hangs forever.

**Root cause:** `app/api/signal/route.ts:73-84` managed the `busy` flag only for `"accept"` (set true) and `"decline"` (set false). The `"end"` type (used by `endConnection`, `cancelRequest`, and the request timeout handler) was not handled. Despite the comment saying "decline/end: free both peers", the `else if` only checked for `"decline"`.

**Fix:** Changed `signalType === "decline"` to `signalType === "decline" || signalType === "end"` in the busy-clearing branch.

### Bug 5 — Leave doesn't clear connected user's `busy` flag
**Symptom:** When a user closes their tab during an active connection, the connected partner remains `busy: true` indefinitely. The stale reaper can't help because the partner is still actively polling (their own heartbeat keeps their row alive).

**Root cause:** `app/api/leave/route.ts` deleted the leaving user's presence row and signals, but never cleared the `busy` flag on the connected user's row.

**Fix:** Before deleting, read the user's `busy` status. If they were in an active connection, set all remaining `busy: true` presence rows to `busy: false`. This is a safe heuristic — a user can only be in one connection, so only their actual partner needs freeing, and in practice the only busy user is that partner. Combined with Bug 4's fix, the `busy` flag is now properly cleaned up on both graceful disconnects ("end" signal) and abrupt disconnects (tab close).

### Bug 6 — ICE candidates silently dropped before remote description is set
**Symptom:** After two users accept a connection, the chat panel shows "Connecting…" indefinitely. The WebRTC data channel never opens, so text chat and video are impossible. The signaling handshake (offer/answer exchange) appears to complete, but the underlying ICE connectivity check stalls.

**Root cause:** `lib/webrtc.ts:110-111` in `handleSignal()` called `flushPendingCandidates()` *before* `setRemoteDescription()`. When ICE candidates arrived from the remote peer before the SDP offer/answer, they were buffered in `pendingCandidates`. But when the offer/answer later arrived and `flushPendingCandidates()` ran, the remote description hadn't been set yet — so `addIceCandidate()` silently failed (the `catch {}` in `flushPendingCandidates` on line 126-127 discarded the error). The candidates were also removed from the buffer (`pendingCandidates = []` on line 122), making them unrecoverable. Neither side ever received the other's ICE candidates, so the ICE connectivity check never completed.

**Fix:** Swapped the order — `setRemoteDescription(desc)` now runs first, then `flushPendingCandidates()`. With the remote description already in place, `addIceCandidate()` succeeds and the ICE candidates are properly applied, allowing the connection to establish.

### Bug 7 — Chat messages sent with wrong type tag
**Symptom:** Two users can connect and see "Connected" in the chat panel, but sent messages never appear on the other side. No errors are shown — the messages are just silently lost.

**Root cause:** `lib/webrtc.ts:132` in `sendChat()` used `{ t: "msg", text }` to encode messages, but the data channel receiver in `wireDataChannel` (line 79) checked for `msg.t === "chat"`. The type tag `"msg"` didn't match `"chat"`, so every incoming message was silently dropped by the `catch {}` on line 84 after the `if` branch was skipped.

**Fix:** Changed the type tag in `sendChat()` from `"msg"` to `"chat"` to match the receiver's expectation.

## Phase 2 — UI/UX polish

### Design system
- Replaced minimal `@theme inline` (4 tokens) with a full design system using a warm coral palette:
  - `--color-surface` / `--color-surface-raised` / `--color-surface-overlay` for layered depth
  - `--color-accent` / `--color-accent-soft` / `--color-accent-muted` for interaction elements
  - `--color-danger` for destructive actions (end connection, end video)
  - `--color-fg` / `--color-fg-muted` / `--color-fg-dim` for text hierarchy
  - `--color-border` for dividers and subtle outlines
  - Custom border-radius tokens (`--radius-sm` through `--radius-xl`)
- Replaced every hardcoded Tailwind utility color (`bg-zinc-*`, `text-zinc-*`, `bg-emerald-*`, `border-zinc-*`) with semantic theme tokens across all components

### Entry gate polish
- Added warm accent radial gradient background for visual warmth
- Card entrance animation (`animate-scale-in`) on mount
- "Locating…" text replaced with CSS spinner + label
- Error text animates in (`animate-fade-in`)
- Reduced placeholder text to essentials
- Added `focus-visible` ring styles for keyboard accessibility

### Map/peers polish
- Peer dots use accent color (`--color-accent`) instead of random HSL — keeps palette consistent
- User pin replaced from 📍 emoji to a styled accent dot matching peer dot style ("You" label)
- Map flies to user's location on entry (`map.flyTo`, 1.5s duration)
- All colors replaced with theme tokens (surface, fg, accent)

### Connection flow polish
- ConnectionPrompt: scale-in + fade-in entrance animation (card + backdrop)
- ConnectionPrompt: Escape key dismisses the prompt
- ConnectionPrompt: Accept button auto-focused on mount
- All colors replaced with theme tokens

### Chat/Video panel polish
- ChatPanel: slides in from the right (`animate-slide-in-right`)
- Chat messages: each bubble fades in with slight scale-up (`animate-message-in`)
- VideoPanel: fades in on mount (`animate-fade-in`)
- All colors replaced with theme tokens

### Animations and transitions
- Keyframe definitions in `globals.css`: `fade-in`, `slide-in-right`, `scale-in`, `message-in`, `slide-down`, `spinner`
- Live view entrance: `animate-fade-in` on `<main>` wrapper
- Notice bar and requesting bars: `animate-slide-down` (slide + fade)
- Each notice instance gets a unique `key` so React remounts it, triggering the animation on each show

### Empty/loading states
- "Locating…" state in EntryGate: CSS spinner replaces bare text
- ChatPanel empty state: "Say hello…" message remains
- No token fallback in WorldMap: message updated with theme tokens


## Phase 3 — Security audit & fixes

### Vulnerabilities identified and fixed

| ID | Issue | Impact | Fix |
|----|-------|--------|-----|
| S1 | **No session authentication** | Anyone who knows a user's session ID can forge requests (poll, signal, leave) impersonating that user | Added HMAC-signed session tokens (`lib/auth.ts`). On join, the server signs the session ID with `SERVER_SECRET` (if set) and returns the token. Every subsequent API call requires the token in the `X-Session-Token` header (or body for leave via `sendBeacon`). The server verifies using `timingSafeEqual` to prevent timing attacks. **Auth is optional** — all route guards check `isAuthEnabled()` first, so the app works without `SERVER_SECRET`. |
| S2 | **No rate limiting** | An attacker could spam `/api/join` to fill the DB, or rapidly poll/signal/leave to exhaust server resources | Added in-memory sliding-window rate limiter (`lib/rate-limit.ts`). Limits: join 20 req/min, leave 10 req/min, poll 60 req/min, signal 40 req/min. Entries are keyed by `METHOD:path:ip`. Keys are evicted after the window expires. |
| S3 | **Missing input length validation on poll/leave** | Arbitrary-length IDs in search params or body could enable resource exhaustion | Added `id.length < 8 \|\| id.length > 64` validation on poll (`GET`) and leave (`POST`). The join route already had this check. |
| S4 | **No security headers** | Missing HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy headers | Added `async headers()` in `next.config.ts` with strict security headers for all routes. |
| S5 | **ngrok dev tunnel URL in source** | Leaked dev tunnel URL in committed `next.config.ts` | Removed `allowedDevOrigins` entirely from committed config. |


## Phase 4 — Pulse Check (Mood Feature)

### Concept
Gives Pulse a sense of purpose beyond "chat with strangers." When joining, users optionally pick a mood (😊😢🔥💤🤔). Their dot on the map takes the mood's color, and the map shows the dominant mood in the area. It answers: "How is my community feeling right now?"

### Changes

**Data layer**
- Added `mood String?` to `Presence` model in Prisma schema (`prisma/schema.prisma`)
- Join API accepts optional `mood` param and stores it in the presence upsert
- Poll API returns `mood` in each peer object

**Client types (`lib/types.ts`)**
- New `Mood` type: `"happy" | "sad" | "fire" | "tired" | "curious" | null`
- `MOODS` constant array with mood → emoji → label mappings
- `MOOD_EMOJI` record for quick emoji lookup from mood string
- `PeerDot` now includes `mood: Mood`

**Entry gate (`EntryGate.tsx`)**
- New mood picker row between the tagline and the "Enter Pulse" button
- 5 emoji buttons; selected one gets a highlighted accent background + ring
- Tapping the same emoji again deselects (mood stays null)
- Mood is passed to `onReady` → `join()` → stored in DB

**Map (`WorldMap.tsx`)**
- Peer dots use mood-specific colors:
  - 😊 happy → `#34d399` (green)
  - 😢 sad → `#60a5fa` (blue)
  - 🔥 fire → `#f97316` (orange)
  - 💤 tired → `#a78bfa` (violet)
  - 🤔 curious → `#facc15` (yellow)
  - null → accent coral (neutral)
- Bottom-left counter shows dominant mood emoji + count alongside total online (e.g. "😊 3 · 5 online")
- Dots update color dynamically when peer list changes

**Connection flow**
- `ConnectionPrompt` accepts optional `peerMood` prop
- When receiving a request, if the other user set a mood, the prompt shows "Feeling 😊"
- `page.tsx` finds the peer's mood from the peers list when processing a "request" signal

**API layer**
- `app/api/join/route.ts` — validates mood against `VALID_MOODS` array, stores in create + update
- `app/api/poll/route.ts` — selects `mood` field, returns it in peer response
- `lib/api.ts` — `join()` accepts optional 4th `mood` param

**Code quality & UX refinements**
- `useReactiveRef` hook (`lib/useReactiveRef.ts`): extracted the duplicated `useRef`/`useState` pattern from `page.tsx` into a reusable hook (conn and video state pairs)
- `FloatingBar` component (`app/components/FloatingBar.tsx`): extracted shared floating bar style used by requesting, failed, and video-waiting states
- Retry on WebRTC failure: when `RTCPeerConnection` enters `failed`, shows "Connection failed" bar with Retry button instead of silently resetting; new `{ kind: "failed"; peerId }` Conn variant
- Sound on incoming request: Web Audio API chime (660 Hz, 0.3s) on `ConnectionPrompt` mount — no audio files
- Escape to end active connection: pressing Escape during `connecting`/`connected` calls `endConnection`
- Mobile responsive: chat panel now `max-w-full sm:max-w-md`, video preview scales down on mobile (`h-28 w-20 md:h-40 md:w-28`)

### Notes
- `prisma db push` and `prisma generate` must be run before the app works with the new column
- Mood is entirely optional — users who skip see the default accent dot
- No new DB tables were added; one nullable column on an existing table is the only persistence

## How to Run

1. **Prerequisites:** Node 20+, pnpm
2. **Install:** `pnpm install`
3. **Configure:** Copy `.env.example` to `.env`, then fill in:
   - `DATABASE_URL` — PostgreSQL connection string (Neon works great)
   - `NEXT_PUBLIC_MAPBOX_TOKEN` — public Mapbox token
   - `SERVER_SECRET` — optional, enables HMAC session auth
4. **Database:** `npx prisma db push` (creates tables from `prisma/schema.prisma`)
5. **Generate client:** `npx prisma generate`
6. **Clean cache:** Delete `.next/` if it exists from a previous build
7. **Start dev:** `npm run dev`
8. **Test:** Open two browser windows (normal + incognito), mock different geolocations via DevTools Sensors, and verify peers appear, connect, and can chat
## Workflow Reflection

I tackled this project in four distinct phases: bug fixes, UI polish, security hardening, and a new feature. Each phase had its own commit, and I never moved to the next until the current one was verified — no overlapping work. My approach was methodical: I used opencode as my AI coding assistant (powered by deepseek-v4-flash-free) to read every relevant file first, understand the broken state, make targeted edits, and confirm with a build. Early on the codebase felt chaotic (7 bugs in a small app!), but once the bugs were squashed and the design system was in place, the rhythm became smooth. The security audit was sobering but satisfying to lock down, and the mood feature was genuinely fun — it gave the app a sense of purpose. Finishing with a clean build and a live Vercel deployment felt like the right capstone to a rewarding build.

