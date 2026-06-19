# Pulse — task tracker

## Phase 0 — Setup
- [x] Copy `.env.example` to `.env` with Postgres + Mapbox credentials
- [x] Run `npx prisma db push` to create tables
- [x] Verify app runs at localhost:3000
- [x] Test with two browser windows (normal + incognito), mock geolocations

## Phase 1 — Make it run
- [x] Bug 1: `join()` ignores API errors — throws on non-ok response instead
- [x] Bug 2: Poll errors silently swallowed — logs to console instead
- [x] Bug 3: Heartbeat refreshes all rows instead of just the caller's — changed `where: {}` to `where: { id }`
- [x] Bug 4: `"end"` signal doesn't clear `busy` flag — added `|| signalType === "end"` to the decline handler
- [x] Bug 5: Leave doesn't clear connected user's `busy` flag — checks busy before delete and frees remaining busy rows
- [x] Bug 6: ICE candidates silently dropped — `flushPendingCandidates` runs before `setRemoteDescription` in `handleSignal`, causing all candidates to be lost before the remote description is set
- [x] Bug 7: Chat messages sent with wrong type tag — `sendChat` used `t: "msg"` but receiver checked for `t: "chat"`
- [x] Verify two users can reliably see each other, connect, chat, and trigger video

## Phase 2 — Make it good
- [x] Design system pass (colors, typography, spacing in `@theme inline`)
- [x] Entry gate polish
- [x] Map/peers UI polish
- [x] Connection flow polish
- [x] Chat/Video panel polish
- [x] Animations and transitions
- [x] Empty/loading/error states

## Phase 3 — Make it secure
- [x] Audit `app/api/*/route.ts` for issues
- [x] Fix identified vulnerabilities
- [x] Document unfixable items for NOTES.md

## Phase 4 — Make it better
- [ ] Design and build new feature
- [ ] Write NOTES.md section explaining it

## Delivery
- [ ] All phases committed with meaningful messages
- [ ] Deployed to Vercel
- [ ] `NOTES.md` written (one section per phase)
