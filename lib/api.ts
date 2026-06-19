// Client-side helpers for talking to the coordination API.
import type { PollResponse, SignalType } from "@/lib/types";

let _token: string | null = null;

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  if (_token) h["x-session-token"] = _token;
  return h;
}

export async function join(
  id: string,
  lat: number,
  lng: number,
): Promise<void> {
  const res = await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, lat, lng }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `join failed: ${res.status}`);
  }
  const data = await res.json();
  _token = data.token ?? null;
}

export async function poll(id: string): Promise<PollResponse> {
  const res = await fetch(`/api/poll?id=${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`poll failed: ${res.status}`);
  return res.json();
}

export async function sendSignal(
  fromId: string,
  toId: string,
  type: SignalType,
  payload?: string,
): Promise<void> {
  const res = await fetch("/api/signal", {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ fromId, toId, type, payload }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `signal failed: ${res.status}`);
  }
}

// Fire-and-forget leave that survives the tab closing.
export function leave(id: string): void {
  const body = JSON.stringify({ id, token: _token });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/leave", body);
  } else {
    void fetch("/api/leave", {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body,
      keepalive: true,
    });
  }
}
