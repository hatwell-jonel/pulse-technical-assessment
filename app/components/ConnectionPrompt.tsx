"use client";

import { useEffect, useRef } from "react";
import type { Mood } from "@/lib/types";
import { MOOD_EMOJI } from "@/lib/types";

export default function ConnectionPrompt({
  title,
  subtitle,
  peerMood,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: {
  title: string;
  subtitle?: string;
  peerMood?: Mood;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    acceptRef.current?.focus();
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDecline();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDecline]);

  const moodLine =
    peerMood && MOOD_EMOJI[peerMood]
      ? `Feeling ${MOOD_EMOJI[peerMood]}`
      : null;

  return (
    <div className="animate-fade-in absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-6">
      <div className="animate-scale-in w-full max-w-xs rounded-2xl bg-surface-raised p-6 text-center text-fg shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        {moodLine && (
          <p className="mt-1 text-sm text-fg-muted">{moodLine}</p>
        )}
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {declineLabel}
          </button>
          <button
            ref={acceptRef}
            onClick={onAccept}
            className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-surface hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
