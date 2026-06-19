import type { ReactNode } from "react";

export default function FloatingBar({ children }: { children: ReactNode }) {
  return (
    <div className="animate-slide-down absolute left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-surface-raised/90 px-4 py-2 text-sm text-fg shadow-lg backdrop-blur">
      {children}
    </div>
  );
}
