# Pulse — Notes

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
