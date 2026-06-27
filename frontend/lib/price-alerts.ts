/**
 * Price-alert client — server-of-truth (no localStorage), mirroring watchlist.ts.
 *
 * Only logged-in users have alerts; unauthenticated callers get an empty list and
 * any mutation is a no-op (the PriceAlertButton gates auth and prompts sign-up
 * before reaching this module).
 *
 * An in-memory cache renders synchronously after the first `loadAlerts()` fetch.
 * The `dsex:price-alerts-change` custom event fires after every successful
 * mutation so subscribers (the stock button, /alerts page, home bell) re-render.
 */

import { getStoredUser, isLoggedIn } from "@/lib/auth";
import {
  apiGetAlerts,
  apiCreateAlert,
  apiUpdateAlert,
  apiDeleteAlert,
  apiRearmAlert,
  type PriceAlert,
} from "@/lib/api";
import { cacheKeys, clearCachePrefix, readCache, writeCache } from "@/lib/swr-cache";

export type { PriceAlert };

const EVENT = "dsex:price-alerts-change";

let _cache: PriceAlert[] | null = null;
let _loadPromise: Promise<PriceAlert[]> | null = null;

function currentUserId(): string | null {
  return getStoredUser()?.user_id ?? null;
}

function persist(alerts: PriceAlert[]): void {
  const uid = currentUserId();
  if (!uid) return;
  writeCache(cacheKeys.alerts(uid), alerts);
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

// ---------------------------------------------------------------------------
// Reads (sync, off the in-memory cache)
// ---------------------------------------------------------------------------

export function getCachedAlerts(): PriceAlert[] {
  return _cache ?? [];
}

/** The armed alert for a code (if any). Prefers an active one over a triggered. */
export function activeAlertFor(code: string): PriceAlert | null {
  if (!_cache) return null;
  const c = code.toUpperCase();
  return _cache.find((a) => a.trading_code === c && a.is_active) ?? null;
}

/** All alerts (armed + recently triggered) for a code. */
export function alertsFor(code: string): PriceAlert[] {
  if (!_cache) return [];
  const c = code.toUpperCase();
  return _cache.filter((a) => a.trading_code === c);
}

/** Fetch from server and fill cache. Returns [] for logged-out users.
 *  Hydrates synchronously from localStorage first for an instant render. */
export async function loadAlerts(): Promise<PriceAlert[]> {
  if (!isLoggedIn()) {
    _cache = [];
    return _cache;
  }
  if (_cache === null) {
    const uid = currentUserId();
    if (uid) {
      const persisted = readCache<PriceAlert[]>(cacheKeys.alerts(uid));
      if (persisted) {
        _cache = persisted;
        emit();
      }
    }
  }
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    try {
      const res = await apiGetAlerts();
      _cache = res.alerts ?? [];
      persist(_cache);
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

// ---------------------------------------------------------------------------
// Mutations — each replaces the cache from the server's authoritative list
// ---------------------------------------------------------------------------

export async function createAlert(code: string, targetPrice: number): Promise<PriceAlert | null> {
  if (!isLoggedIn()) return null;
  try {
    const res = await apiCreateAlert({ trading_code: code.toUpperCase(), target_price: targetPrice });
    _cache = res.alerts ?? [];
    persist(_cache);
    emit();
    return res.alert;
  } catch {
    return null;
  }
}

export async function updateAlert(id: string, targetPrice: number): Promise<PriceAlert | null> {
  if (!isLoggedIn()) return null;
  try {
    const res = await apiUpdateAlert(id, { target_price: targetPrice });
    _cache = res.alerts ?? [];
    persist(_cache);
    emit();
    return res.alert;
  } catch {
    return null;
  }
}

export async function rearmAlert(id: string): Promise<PriceAlert | null> {
  if (!isLoggedIn()) return null;
  try {
    const res = await apiRearmAlert(id);
    _cache = res.alerts ?? [];
    persist(_cache);
    emit();
    return res.alert;
  } catch {
    return null;
  }
}

export async function deleteAlert(id: string): Promise<void> {
  if (!isLoggedIn()) return;
  try {
    const res = await apiDeleteAlert(id);
    _cache = res.alerts ?? [];
    persist(_cache);
    emit();
  } catch {
    // swallow — UI keeps prior state
  }
}

export function subscribeAlerts(cb: () => void): () => void {
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
    clearCachePrefix(`${cacheKeys.alerts("")}`.slice(0, -1));
    emit();
  });
}
