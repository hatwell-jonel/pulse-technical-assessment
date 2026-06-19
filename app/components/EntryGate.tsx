"use client";

import { useState } from "react";
import type { Mood } from "@/lib/types";
import { MOODS } from "@/lib/types";

export default function EntryGate({
  onReady,
}: {
  onReady: (lat: number, lng: number, mood?: Mood) => void;
}) {
  const [selectedMood, setSelectedMood] = useState<Mood>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [prompt, setPrompt] = useState<string | null>(null);

  function handleClick() {
    if (!selectedMood) {
      setPrompt("Pick a mood first");
      setTimeout(() => setPrompt(null), 1500);
      return;
    }
    enter();
  }

  function enter() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => onReady(pos.coords.latitude, pos.coords.longitude, selectedMood),
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is required to place you on the map."
            : "Couldn't get your location. Please try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-surface p-6 text-fg">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, var(--color-accent) 0%, transparent 60%)",
        }}
      />
      <div className="animate-scale-in text-center">
        <h1 className="text-4xl font-bold tracking-tight">Pulse</h1>
        <p className="mt-2 max-w-sm text-fg-muted">
          A living globe of anonymous strangers. Drop onto the map and connect.
        </p>
      </div>

      <div className="animate-fade-in flex flex-col items-center gap-3">
        <p className="text-sm text-fg-muted">How are you feeling?</p>
        <div className="flex gap-2">
          {MOODS.map(({ mood, emoji, label }) => (
            <button
              key={mood}
              onClick={() => setSelectedMood(selectedMood === mood ? null : mood)}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                selectedMood === mood
                  ? "scale-110 bg-accent ring-2 ring-accent-soft"
                  : "bg-surface-raised hover:bg-surface-overlay"
              }`}
              title={label}
            >
              {emoji}
            </button>
          ))}
        </div>
        {!selectedMood && status === "idle" && (
          <p className="animate-fade-in text-xs text-fg-dim">Pick a mood to continue</p>
        )}
        {prompt && (
          <p className="animate-fade-in text-xs text-accent-soft">{prompt}</p>
        )}
      </div>

      <button
        onClick={handleClick}
        disabled={status === "locating"}
        className="flex items-center gap-2 rounded-full bg-accent px-8 py-3 font-semibold text-surface transition hover:bg-accent-soft disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {status === "locating" ? (
          <>
            <span className="inline-block animate-spinner" />
            Locating
          </>
        ) : (
          "Enter Pulse"
        )}
      </button>

      {status === "error" && (
        <p className="max-w-sm animate-fade-in text-center text-sm text-danger">
          {error}
        </p>
      )}

      <p className="max-w-sm text-center text-xs text-fg-dim">
        No sign-up. Your dot is placed 1–3&nbsp;km from your real location.
        Nothing is stored — closing the tab ends everything.
      </p>
    </div>
  );
}
