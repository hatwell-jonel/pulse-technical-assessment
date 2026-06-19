interface Entry {
  timestamps: number[];
}

const store = new Map<string, Entry>();

const WINDOW_MS = 60_000;
const MAX_REQS = 40;

export function checkRateLimit(key: string, maxReqs = MAX_REQS, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxReqs) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
}

export function rateLimitKey(method: string, pathname: string, ip: string): string {
  return `${method}:${pathname}:${ip}`;
}
