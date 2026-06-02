import type { StreakInfo } from "./api";

// In-memory pub/sub for the login streak. PingTracker publishes the latest
// streak returned by /api/auth/ping; StreakBadge subscribes. Mirrors the
// subscribeWatchlist pattern in lib/watchlist.ts.

let current: StreakInfo | null = null;
type Listener = (s: StreakInfo | null) => void;
const listeners = new Set<Listener>();

export function getStreak(): StreakInfo | null {
  return current;
}

export function publishStreak(s: StreakInfo | null): void {
  current = s;
  listeners.forEach((l) => l(s));
}

export function subscribeStreak(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
