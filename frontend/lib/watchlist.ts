const KEY = "dsex.watchlist";
const EVENT = "dsex:watchlist-change";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(codes: string[]) {
  if (typeof window === "undefined") return;
  const unique = Array.from(new Set(codes.map((c) => c.toUpperCase())));
  window.localStorage.setItem(KEY, JSON.stringify(unique));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getWatchlist(): string[] {
  return read();
}

export function isWatched(code: string): boolean {
  return read().includes(code.toUpperCase());
}

export function addToWatchlist(code: string) {
  const list = read();
  const upper = code.toUpperCase();
  if (!list.includes(upper)) write([...list, upper]);
}

export function removeFromWatchlist(code: string) {
  write(read().filter((c) => c !== code.toUpperCase()));
}

export function toggleWatchlist(code: string): boolean {
  if (isWatched(code)) {
    removeFromWatchlist(code);
    return false;
  }
  addToWatchlist(code);
  return true;
}

export function subscribeWatchlist(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

// ---------------------------------------------------------------------------
// DB-synced helpers (used when user is logged in)
// ---------------------------------------------------------------------------

import { isLoggedIn } from "@/lib/auth";
import {
  apiAddToWatchlist,
  apiRemoveFromWatchlist,
  apiSetWatchlist,
} from "@/lib/api";

export async function addToWatchlistSynced(code: string): Promise<void> {
  addToWatchlist(code); // optimistic local update
  if (isLoggedIn()) {
    await apiAddToWatchlist([code]).catch(() => {});
  }
}

export async function removeFromWatchlistSynced(code: string): Promise<void> {
  removeFromWatchlist(code);
  if (isLoggedIn()) {
    await apiRemoveFromWatchlist([code]).catch(() => {});
  }
}

export async function toggleWatchlistSynced(code: string): Promise<boolean> {
  if (isWatched(code)) {
    await removeFromWatchlistSynced(code);
    return false;
  }
  await addToWatchlistSynced(code);
  return true;
}

export async function mergeWatchlistOnLogin(serverCodes: string[]): Promise<void> {
  const localCodes = getWatchlist();
  const merged = Array.from(
    new Set([
      ...localCodes.map((c) => c.toUpperCase()),
      ...serverCodes.map((c) => c.toUpperCase()),
    ])
  );
  write(merged);

  const needsSync =
    merged.length !== serverCodes.length ||
    merged.some((c) => !serverCodes.includes(c));
  if (needsSync) {
    await apiSetWatchlist(merged).catch(() => {});
  }
}
