"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import type { PeerDot } from "@/lib/types";
import { MOOD_EMOJI } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "pk.eyJ1IjoicHVsc2UtbWFwIiwiYSI6ImNrMDBkZW1vMDAwMDAwMDAifQ.AAAAAAAAAAAAAAAAAAAAAA";

const MOOD_COLORS: Record<string, string> = {
  happy: "#34d399",
  sad: "#60a5fa",
  fire: "#f97316",
  tired: "#a78bfa",
  curious: "#facc15",
};

function dotColor(mood: string | null): string {
  if (mood && MOOD_COLORS[mood]) return MOOD_COLORS[mood];
  return "var(--color-accent)";
}

export default function WorldMap({
  peers,
  me,
  onPeerClick,
  canConnect,
}: {
  peers: PeerDot[];
  me: { lat: number; lng: number } | null;
  onPeerClick: (id: string) => void;
  canConnect: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const meMarkerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);

  const onPeerClickRef = useRef(onPeerClick);
  const canConnectRef = useRef(canConnect);
  useEffect(() => {
    onPeerClickRef.current = onPeerClick;
    canConnectRef.current = canConnect;
  });

  // Compute dominant mood for the counter badge.
  const dominantMood = useMemo(() => {
    const moods = peers.map((p) => p.mood).filter(Boolean) as string[];
    if (moods.length === 0) return null;
    const freq: Record<string, number> = {};
    for (const m of moods) freq[m] = (freq[m] || 0) + 1;
    let best = moods[0];
    for (const m of moods) if (freq[m] > freq[best]) best = m;
    return { mood: best, count: freq[best] };
  }, [peers]);

  // Initialise the map once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    let cancelled = false;
    const markers = markersRef.current;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [0, 20],
        zoom: 1.4,
        attributionControl: true,
      });
      map.on("load", () => {
        if (!cancelled) setReady(true);
      });
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
      markers.clear();
      meMarkerRef.current?.remove();
      meMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show / move the user's own pin. Also fly to the user on first mount.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !me) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      if (!meMarkerRef.current) {
        map.flyTo({ center: [me.lng, me.lat], zoom: 4, duration: 1500 });
        const el = document.createElement("div");
        el.className = "pulse-me";
        el.title = "You are here";
        const label = document.createElement("span");
        label.className = "pulse-me-label";
        label.textContent = "You";
        el.appendChild(label);
        meMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([me.lng, me.lat])
          .addTo(map);
      } else {
        meMarkerRef.current.setLngLat([me.lng, me.lat]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, ready]);

  // Reconcile markers whenever the peer list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      const markers = markersRef.current;
      const seen = new Set<string>();

      for (const peer of peers) {
        seen.add(peer.id);
        let marker = markers.get(peer.id);
        if (!marker) {
          const el = document.createElement("button");
          el.className = "pulse-dot";
          el.style.background = dotColor(peer.mood);
          el.title = "Tap to connect";
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (canConnectRef.current) onPeerClickRef.current(peer.id);
          });
          if (peer.mood && MOOD_EMOJI[peer.mood]) {
            const label = document.createElement("span");
            label.className = "mood-label";
            label.textContent = MOOD_EMOJI[peer.mood];
            el.appendChild(label);
          }
          marker = new mapboxgl.Marker({ element: el })
            .setLngLat([peer.lng, peer.lat])
            .addTo(map);
          markers.set(peer.id, marker);
        }
        const el = marker.getElement();
        el.style.background = dotColor(peer.mood);
        el.style.opacity = peer.busy ? "0.35" : "1";
        const existingLabel = el.querySelector(".mood-label");
        const moodEmoji = peer.mood ? MOOD_EMOJI[peer.mood] : null;
        if (moodEmoji) {
          if (existingLabel) {
            existingLabel.textContent = moodEmoji;
          } else {
            const label = document.createElement("span");
            label.className = "mood-label";
            label.textContent = moodEmoji;
            el.appendChild(label);
          }
        } else if (existingLabel) {
          existingLabel.remove();
        }
      }

      for (const [id, marker] of markers) {
        if (!seen.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [peers, ready]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full bg-surface" />

      {!TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-md rounded-lg bg-surface-raised p-4 text-sm text-fg">
            Set{" "}
            <code className="text-accent">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
            <code>.env</code> to load the map.
          </p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-surface-raised/80 px-3 py-1.5 text-xs text-fg-muted backdrop-blur">
        {dominantMood && (
          <span>
            {MOOD_EMOJI[dominantMood.mood] ?? ""} {dominantMood.count}
            <span className="mx-1">&middot;</span>
          </span>
        )}
        <span>{peers.length} online</span>
      </div>
    </div>
  );
}
