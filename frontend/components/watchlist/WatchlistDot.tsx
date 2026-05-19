"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isLoggedIn, getToken } from "@/lib/auth";
import { getCachedWatchlist, loadWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { getWatchlistNews, getApiUrl } from "@/lib/api";

let _sessionChecked = false;
let _hasFresh = false;

async function fetchLastVisit(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${getApiUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: { watchlist_last_visit_at?: string | null } };
    return data.user?.watchlist_last_visit_at ?? null;
  } catch {
    return null;
  }
}

export default function WatchlistDot() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (pathname === "/watchlist") {
      _hasFresh = false;
      setShow(false);
      return;
    }
    if (!isLoggedIn()) {
      setShow(false);
      return;
    }
    if (_sessionChecked) {
      setShow(_hasFresh);
      return;
    }

    let cancelled = false;
    const idle =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => number })
            .requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 800);

    idle(async () => {
      if (cancelled) return;
      await loadWatchlist();
      const codes = getCachedWatchlist();
      if (codes.length === 0) {
        _sessionChecked = true;
        return;
      }
      const [news, lastVisit] = await Promise.all([
        getWatchlistNews(codes).catch(() => []),
        fetchLastVisit(),
      ]);
      _sessionChecked = true;
      if (!lastVisit || news.length === 0) {
        _hasFresh = false;
        if (!cancelled) setShow(false);
        return;
      }
      const lvMs = Date.parse(lastVisit);
      const fresh = news.some((n) => Date.parse(n.post_date) > lvMs);
      _hasFresh = fresh;
      if (!cancelled) setShow(fresh);
    });

    const unsub = subscribeWatchlist(() => {
      // Watchlist contents changed — re-evaluate on next mount
      _sessionChecked = false;
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [pathname]);

  if (!show) return null;
  return (
    <span
      aria-label="New activity in your watchlist"
      title="New activity in your watchlist"
      className="absolute -top-0.5 -right-0.5 inline-block h-2 w-2 rounded-full bg-red-500 ring-2 ring-[var(--bg)]"
    />
  );
}
