# Pulse — Notes

## Phase 0 — Setup

- Copied `.env.example` to `.env`
- Provisioned a free Neon Postgres database and set `DATABASE_URL`
- Generated a free Mapbox token and set `NEXT_PUBLIC_MAPBOX_TOKEN`
- Ran `npx prisma db push` to create `Presence` and `Signal` tables
- Confirmed app starts at `localhost:3000`
- Tested with two browser windows (normal + incognito) with mock geolocations via DevTools Sensors
