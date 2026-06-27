/**
 * Stale-while-revalidate cache backed by localStorage.
 *
 * Pages hydrate state synchronously from `readCache` for an instant first paint
 * (even on a cold backend), then fire the real fetch in the background and
 * `writeCache` the fresh response so the next visit is also instant.
 *
 * No automatic eviction. Entries are JSON-serialised so callers must store
 * plain data (no class instances, no Map/Set — convert first).
 */

interface Entry<T> {
  data: T;
  ts: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Read cached value of any age. Returns null if missing/corrupt. */
export function readCache<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<T>;
    return parsed.data;
  } catch {
    return null;
  }
}

/** Read cached value only if newer than `maxAgeMs`. */
export function readFresh<T>(key: string, maxAgeMs: number): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<T>;
    if (Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/** Write value with current timestamp. Silently ignores quota errors. */
export function writeCache<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  try {
    const entry: Entry<T> = { data, ts: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // quota exceeded or serialisation failed — non-fatal
  }
}

export function clearCache(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Remove every entry whose key starts with `prefix`. */
export function clearCachePrefix(prefix: string): void {
  if (!isBrowser()) return;
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) toDelete.push(k);
    }
    for (const k of toDelete) window.localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Canonical key prefix + builders
// ---------------------------------------------------------------------------

export const CACHE_PREFIX = "dsex.cache.";

export const cacheKeys = {
  scores: `${CACHE_PREFIX}scores`,
  extremes: `${CACHE_PREFIX}extremes`,
  dividends: `${CACHE_PREFIX}dividends`,
  allCodes: `${CACHE_PREFIX}allCodes`,
  watchlistCodes: (userId: string) => `${CACHE_PREFIX}watchlistCodes.${userId}`,
  watchlistNotes: (userId: string) => `${CACHE_PREFIX}watchlistNotes.${userId}`,
  watchlistNews: (codes: string[]) =>
    `${CACHE_PREFIX}watchlistNews.${[...codes].map((c) => c.toUpperCase()).sort().join(",")}`,
  alerts: (userId: string) => `${CACHE_PREFIX}alerts.${userId}`,
  portfolio: (userId: string) => `${CACHE_PREFIX}portfolio.${userId}`,
  portfolioTxns: (userId: string) => `${CACHE_PREFIX}portfolioTxns.${userId}`,
  dailyPicks: (userId: string) => `${CACHE_PREFIX}dailyPicks.${userId}`,
};
