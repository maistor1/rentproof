"use client";

import { useEffect, useState } from "react";

// Seconds since startedAt, ticking once a second. Time is read in the interval
// callback, never during render, so rendering stays pure.
export function useElapsedSeconds(startedAt: number | null): number {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (startedAt === null || now === null) return 0;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function formatElapsed(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
