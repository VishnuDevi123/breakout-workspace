"use client";

import { useEffect, useState } from "react";

/** mm:ss, never negative. */
export function formatClock(totalSec: number): string {
  const safe = Math.max(0, totalSec);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Seconds from typed "m:ss" or plain minutes ("2" is 2:00); null when it is neither. */
export function parseClock(text: string): number | null {
  const match = /^\s*(\d{1,3})(?::([0-5]?\d))?\s*$/.exec(text);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2] ?? 0);
}

/**
 * Seconds left on the round, recomputed every second from the server's endsAt.
 * Null when endsAt is 0, which means the round runs until the host closes it.
 * Shared by the host's live view and the participant screen.
 */
export function useRemainingSec(endsAt: number): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return endsAt ? Math.max(0, Math.round((endsAt - now) / 1000)) : null;
}

/** The time now, refreshed every `everyMs`, for labels such as "2 min ago". */
export function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);

  return now;
}

/** "just now", "5 min ago", "2 h ago". */
export function timeAgo(at: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}
