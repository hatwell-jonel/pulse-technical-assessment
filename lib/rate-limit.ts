const store = new Map<string, number[]>();

const WINDOW_MS = 60_000;
const MAX_REQS = 40;

export function checkRateLimit(key: string, maxReqs = MAX_REQS, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  let timestamps = store.get(key);

  if (!timestamps) {
    timestamps = [];
    store.set(key, timestamps);
  }

  timestamps = timestamps.filter((t) => now - t < windowMs);
  store.set(key, timestamps);

  if (timestamps.length >= maxReqs) {
    return false;
  }

  timestamps.push(now);
  return true;
}

export function rateLimitKey(method: string, pathname: string, ip: string): string {
  return `${method}:${pathname}:${ip}`;
}
