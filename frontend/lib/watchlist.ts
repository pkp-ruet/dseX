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
 *
 * Beside the code list the server keeps per-code meta (`added_at`,
 * `price_at_add`) so the watchlist page can show "since you added". It is
 * cached here too and exposed via `getCachedWatchlistMeta()`.
 */

import { getStoredUser, isLoggedIn } from "@/lib/auth";
import {
  apiGetWatchlist,
  apiAddToWatchlist,
  apiRemoveFromWatchlist,
  apiSetWatchlist,
  type WatchlistMeta,
  type WatchlistResponse,
} from "@/lib/api";
import { cacheKeys, clearCachePrefix, readCache, writeCache } from "@/lib/swr-cache";

function currentUserId(): string | null {
  return getStoredUser()?.user_id ?? null;
}

function persist(codes: string[], meta: WatchlistMeta): void {
  const uid = currentUserId();
  if (!uid) return;
  writeCache(cacheKeys.watchlistCodes(uid), codes);
  writeCache(cacheKeys.watchlistMeta(uid), meta);
}

const EVENT = "dsex:watchlist-change";

let _cache: string[] | null = null;
let _meta: WatchlistMeta = {};
let _loadPromise: Promise<string[]> | null = null;

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
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

function normalizeMeta(meta: WatchlistMeta | undefined | null): WatchlistMeta {
  if (!meta || typeof meta !== "object") return {};
  const out: WatchlistMeta = {};
  for (const [code, entry] of Object.entries(meta)) {
    if (!entry || typeof entry.added_at !== "string") continue;
    out[code.toUpperCase()] = {
      added_at: entry.added_at,
      price_at_add: typeof entry.price_at_add === "number" ? entry.price_at_add : null,
    };
  }
  return out;
}

/** Apply a server response to the in-memory + persisted caches. */
function applyResponse(res: WatchlistResponse): void {
  _cache = normalize(res.codes);
  // An older backend that returns no meta must not wipe what we already know.
  if (res.meta !== undefined) _meta = normalizeMeta(res.meta);
  persist(_cache, _meta);
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------

export function getCachedWatchlist(): string[] {
  return _cache ?? [];
}

/** Per-code "added on" meta for the cached watchlist (may be sparse). */
export function getCachedWatchlistMeta(): WatchlistMeta {
  return _meta;
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
    _meta = {};
    return _cache;
  }
  // SWR: serve persisted copy immediately, refresh in background.
  if (_cache === null) {
    const uid = currentUserId();
    if (uid) {
      const persisted = readCache<string[]>(cacheKeys.watchlistCodes(uid));
      if (persisted) {
        _cache = normalize(persisted);
        _meta = normalizeMeta(readCache<WatchlistMeta>(cacheKeys.watchlistMeta(uid)));
        emit();
      }
    }
  }
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    try {
      applyResponse(await apiGetWatchlist());
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

/** Add a code. Pass `restore` (the meta captured before a remove) when undoing
 *  so the original added-on date and price survive. */
export async function addToWatchlist(code: string, restore?: WatchlistMeta): Promise<void> {
  if (!isLoggedIn()) return;
  const upper = code.toUpperCase();
  if (_cache?.includes(upper)) return;
  try {
    applyResponse(await apiAddToWatchlist([upper], restore));
    emit();
  } catch {
    // swallow — UI keeps prior state
  }
}

export async function removeFromWatchlist(code: string): Promise<void> {
  if (!isLoggedIn()) return;
  const upper = code.toUpperCase();
  try {
    applyResponse(await apiRemoveFromWatchlist([upper]));
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
    applyResponse(await apiSetWatchlist(normalize(codes)));
    emit();
    return _cache ?? [];
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
// Cache invalidation on logout
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  window.addEventListener("dsex:auth-logout", () => {
    _cache = [];
    _meta = {};
    // Drop every user-scoped cache so the next signed-in user starts clean.
    clearCachePrefix(`${cacheKeys.watchlistCodes("")}`.slice(0, -1));
    clearCachePrefix(`${cacheKeys.watchlistMeta("")}`.slice(0, -1));
    clearCachePrefix(`${cacheKeys.portfolio("")}`.slice(0, -1));
    emit();
  });
}
