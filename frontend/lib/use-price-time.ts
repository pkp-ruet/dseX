"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { bstDateStr, formatBstTimeLabel, isMarketOpen } from "@/lib/market-hours";

/** Which prices the site is showing while DSE trades. */
export type PriceTime =
  /** Today's prices, from the scrape at `time` ("1:42 PM"; "" when unknown). */
  | { kind: "today"; time: string }
  /** Still the session of `date` (ISO): today's first prices aren't in yet. */
  | { kind: "earlier"; date: string }
  /** The index answered without a date, or not at all. */
  | { kind: "unknown" };

/**
 * When the prices on screen were last updated, during the open session only
 * (10:00–2:30 BST); null outside it, and while `enabled` is false. Asks
 * `/api/market-index` on mount, every 5 minutes while the tab is in view, and
 * when the tab comes back. One rule for the "last updated" strip
 * (`MarketDataBanner`) and the signed-in home's date line (2026-11-25: the
 * strip is left off the signed-in home, whose date line says the time).
 */
export function usePriceTime(enabled = true): PriceTime | null {
  const [state, setState] = useState<PriceTime | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState(null);
      return;
    }
    let cancelled = false;

    const refresh = async () => {
      if (!isMarketOpen()) {
        if (!cancelled) setState(null);
        return;
      }
      let date: string | null = null;
      let scrapedAt: string | null = null;
      try {
        // "no-cache" still asks the backend every time (as fresh as "no-store"),
        // but lets it answer an unchanged index with an empty 304 (ETag).
        const res = await fetch(`${getApiUrl()}/api/market-index`, { cache: "no-cache" });
        if (res.ok) {
          const data = (await res.json()) as { date?: string | null; scraped_at?: string | null };
          date = data?.date ?? null;
          scrapedAt = data?.scraped_at ?? null;
        }
      } catch {
        /* network error: say only what we know */
      }
      if (cancelled) return;
      if (date && date === bstDateStr()) {
        setState({ kind: "today", time: scrapedAt ? formatBstTimeLabel(scrapedAt) : "" });
      } else if (date) {
        setState({ kind: "earlier", date });
      } else {
        setState({ kind: "unknown" });
      }
    };

    // The data changes at most a few times a session: poll every 5 minutes,
    // skip hidden tabs and catch up when the tab comes back.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    const id = setInterval(onVisible, 5 * 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return state;
}
