"use client";

import { useEffect, useRef } from "react";

export default function VideoPanel({
  localStream,
  remoteStream,
  onEnd,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEnd: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current && localRef.current.srcObject !== localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteRef.current.srcObject !== remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="animate-fade-in absolute inset-0 z-30 flex flex-col bg-black">
      <div className="relative flex-1">
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="h-full w-full bg-surface object-cover"
        />
        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center text-fg-muted">
            Waiting for stranger&rsquo;s video…
          </div>
        )}
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-4 right-4 h-40 w-28 rounded-lg border border-border bg-surface-raised object-cover"
        />
      </div>
      <div className="flex justify-center bg-surface p-4">
        <button
          onClick={onEnd}
          className="rounded-full bg-danger px-8 py-3 font-semibold text-white hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          End video
        </button>
      </div>
    </div>
  );
}
