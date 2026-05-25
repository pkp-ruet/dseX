/**
 * Watchlist client — server-of-truth (no localStorage).
 *
 * Only logged-in users have a watchlist; unauthenticated callers get an empty
 * list and any mutation is a no-op (the StarButton / AddBar UI gates auth and
 * prompts sign-up before reaching this module).
 *
 * In-memory cache lets us render synchronously after the first `loadWatchlist()`
 * fetch. The `dsex:watchlist-change` custom event is dispatched after every
 * successful mutation so subscribers re-render.
 */

import { getStoredUser, isLoggedIn } from "@/lib/auth";
import {
  apiGetWatchlist,
  apiAddToWatchlist,
  apiRemoveFromWatchlist,
  apiSetWatchlist,
  apiGetWatchlistNotes,
  apiSetWatchlistNote,
} from "@/lib/api";
import { cacheKeys, clearCachePrefix, readCache, writeCache } from "@/lib/swr-cache";

function currentUserId(): string | null {
  return getStoredUser()?.user_id ?? null;
}

function persistCodes(codes: string[]): void {
  const uid = currentUserId();
  if (!uid) return;
  writeCache(cacheKeys.watchlistCodes(uid), codes);
}

function persistNotes(notes: Record<string, string>): void {
  const uid = currentUserId();
  if (!uid) return;
  writeCache(cacheKeys.watchlistNotes(uid), notes);
}

const EVENT = "dsex:watchlist-change";
const NOTES_EVENT = "dsex:watchlist-notes-change";

let _cache: string[] | null = null;
let _loadPromise: Promise<string[]> | null = null;

let _notes: Record<string, string> | null = null;
let _notesLoadPromise: Promise<Record<string, string>> | null = null;

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

function emitNotes() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTES_EVENT));
}

function normalize(codes: string[] | undefined | null): string[] {
  if (!codes) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of codes) {
    if (typeof c !== "string") continue;
    const u = c.toUpperCase();
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------

export function getCachedWatchlist(): string[] {
  return _cache ?? [];
}

export function isWatched(code: string): boolean {
  if (!_cache) return false;
  return _cache.includes(code.toUpperCase());
}

/** Fetch from server and fill cache. Returns [] for logged-out users.
 *  Hydrates `_cache` synchronously from localStorage first so callers get an
 *  instant-render value even while the API fetch is in flight. */
export async function loadWatchlist(): Promise<string[]> {
  if (!isLoggedIn()) {
    _cache = [];
    return _cache;
  }
  // SWR: serve persisted copy immediately, refresh in background.
  if (_cache === null) {
    const uid = currentUserId();
    if (uid) {
      const persisted = readCache<string[]>(cacheKeys.watchlistCodes(uid));
      if (persisted) {
        _cache = normalize(persisted);
        emit();
      }
    }
  }
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    try {
      const res = await apiGetWatchlist();
      _cache = normalize(res.codes);
      persistCodes(_cache);
    } catch {
      if (_cache === null) _cache = [];
    } finally {
      _loadPromise = null;
    }
    emit();
    return _cache ?? [];
  })();
  return _loadPromise;
}

export async function addToWatchlist(code: string): Promise<void> {
  if (!isLoggedIn()) return;
  const upper = code.toUpperCase();
  if (_cache?.includes(upper)) return;
  try {
    const res = await apiAddToWatchlist([upper]);
    _cache = normalize(res.codes);
    persistCodes(_cache);
    emit();
  } catch {
    // swallow — UI keeps prior state
  }
}

export async function removeFromWatchlist(code: string): Promise<void> {
  if (!isLoggedIn()) return;
  const upper = code.toUpperCase();
  try {
    const res = await apiRemoveFromWatchlist([upper]);
    _cache = normalize(res.codes);
    persistCodes(_cache);
    emit();
  } catch {
    // swallow
  }
}

export async function toggleWatchlist(code: string): Promise<boolean> {
  if (isWatched(code)) {
    await removeFromWatchlist(code);
    return false;
  }
  await addToWatchlist(code);
  return _cache?.includes(code.toUpperCase()) ?? false;
}

export async function setWatchlist(codes: string[]): Promise<string[]> {
  if (!isLoggedIn()) return [];
  try {
    const res = await apiSetWatchlist(normalize(codes));
    _cache = normalize(res.codes);
    persistCodes(_cache);
    emit();
    return _cache;
  } catch {
    return _cache ?? [];
  }
}

export function subscribeWatchlist(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export function getCachedNotes(): Record<string, string> {
  return _notes ?? {};
}

export function getNote(code: string): string {
  if (!_notes) return "";
  return _notes[code.toUpperCase()] ?? "";
}

export async function loadNotes(): Promise<Record<string, string>> {
  if (!isLoggedIn()) {
    _notes = {};
    return _notes;
  }
  // SWR: hydrate from localStorage before the API call resolves.
  if (_notes === null) {
    const uid = currentUserId();
    if (uid) {
      const persisted = readCache<Record<string, string>>(cacheKeys.watchlistNotes(uid));
      if (persisted) {
        _notes = persisted;
        emitNotes();
      }
    }
  }
  if (_notesLoadPromise) return _notesLoadPromise;
  _notesLoadPromise = (async () => {
    try {
      const res = await apiGetWatchlistNotes();
      _notes = res.notes ?? {};
      persistNotes(_notes);
    } catch {
      if (_notes === null) _notes = {};
    } finally {
      _notesLoadPromise = null;
    }
    emitNotes();
    return _notes ?? {};
  })();
  return _notesLoadPromise;
}

export async function setNote(code: string, text: string): Promise<void> {
  if (!isLoggedIn()) return;
  try {
    const res = await apiSetWatchlistNote(code, text);
    _notes = res.notes ?? {};
    persistNotes(_notes);
    emitNotes();
  } catch {
    // swallow
  }
}

export function subscribeNotes(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(NOTES_EVENT, handler);
  return () => window.removeEventListener(NOTES_EVENT, handler);
}

// ---------------------------------------------------------------------------
// Cache invalidation on logout
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  window.addEventListener("dsex:auth-logout", () => {
    _cache = [];
    _notes = {};
    // Drop every user-scoped cache so the next signed-in user starts clean.
    clearCachePrefix(`${cacheKeys.watchlistCodes("")}`.slice(0, -1));
    clearCachePrefix(`${cacheKeys.watchlistNotes("")}`.slice(0, -1));
    clearCachePrefix(`${cacheKeys.portfolio("")}`.slice(0, -1));
    emit();
    emitNotes();
  });
}
