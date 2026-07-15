"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGetPortfolio, type PortfolioHolding } from "@/lib/api";
import { loadWatchlist, getCachedWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { getStoredUser } from "@/lib/auth";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";

export interface PersonalCodes {
  /** Trading codes the user owns (uppercased). */
  portfolio: Set<string>;
  /** Trading codes on the user's watchlist (uppercased). */
  watchlist: Set<string>;
}

const upper = (arr: string[]): Set<string> => new Set(arr.map((c) => c.toUpperCase()));

/**
 * Client hook exposing the signed-in user's portfolio + watchlist trading
 * codes, hydrated from the SWR localStorage caches for an instant read and
 * refreshed from the server on mount. Logged-out users get empty sets.
 *
 * Both sets start empty so the first client render matches the server-rendered
 * markup (no hydration mismatch); they fill in right after mount and then track
 * live watchlist changes via the `dsex:watchlist-change` event.
 */
export function usePersonalCodes(): PersonalCodes {
  const { isLoggedIn } = useAuth();
  const [portfolio, setPortfolio] = useState<Set<string>>(() => new Set());
  const [watchlist, setWatchlist] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!isLoggedIn) {
      setPortfolio(new Set());
      setWatchlist(new Set());
      return;
    }
    let alive = true;

    // Watchlist — instant in-memory value, server refresh, then live updates.
    setWatchlist(upper(getCachedWatchlist()));
    loadWatchlist()
      .then((c) => alive && setWatchlist(upper(c)))
      .catch(() => {});
    const unsub = subscribeWatchlist(() => alive && setWatchlist(upper(getCachedWatchlist())));

    // Portfolio — hydrate from cache, then refresh from server.
    const uid = getStoredUser()?.user_id ?? null;
    if (uid) {
      const cached = readCache<PortfolioHolding[]>(cacheKeys.portfolio(uid));
      if (cached) setPortfolio(upper(cached.map((h) => h.trading_code)));
    }
    apiGetPortfolio()
      .then((r) => {
        if (!alive) return;
        setPortfolio(upper(r.holdings.map((h) => h.trading_code)));
        if (uid) writeCache(cacheKeys.portfolio(uid), r.holdings);
      })
      .catch(() => {});

    return () => {
      alive = false;
      unsub();
    };
  }, [isLoggedIn]);

  return { portfolio, watchlist };
}
