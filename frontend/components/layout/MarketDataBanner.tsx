"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { isTradingDay, isMarketOpen, isAfterOpen, bstDateStr } from "@/lib/market-hours";

// Date string ("YYYY-MM-DD") for which the banner is suppressed — set when the
// user dismisses it OR when the post-close check confirms today's scrape has run.
// Date-keyed so it resets by itself the next day.
const HIDE_KEY = "dsex.market-banner-hidden";

/**
 * Daily lifecycle:
 *  - Market hours (10:00–2:30): always show — during the live session the site is
 *    always serving the previous session's close. No API call needed.
 *  - After the 2:30 close: check whether the scraper has loaded today's data. Once
 *    it has, hide for the rest of the day and stop checking. Until then, keep showing.
 *  - Before open / non-trading days: hidden.
 *  - Next trading day: resets automatically and the banner reappears at the open.
 */
export default function MarketDataBanner() {
  // Start hidden so SSR and the first client render match; the effect decides.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isTradingDay()) return;

    const today = bstDateStr();

    // Suppressed for today (dismissed, or post-close check already confirmed the
    // scrape ran). No API call.
    try {
      if (localStorage.getItem(HIDE_KEY) === today) return;
    } catch {
      /* localStorage unavailable — continue */
    }

    // During the live session: always show, no network call.
    if (isMarketOpen()) {
      setVisible(true);
      return;
    }

    // Before the open: nothing yet — the banner appears when the market opens.
    if (!isAfterOpen()) return;

    // After the close: has the scraper loaded today's data yet?
    let cancelled = false;
    (async () => {
      let marketDate: string | null = null;
      try {
        const res = await fetch(`${getApiUrl()}/api/market-index`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { date?: string | null };
          marketDate = data?.date ?? null;
        }
      } catch {
        marketDate = null;
      }
      if (cancelled) return;

      if (marketDate === today) {
        // Scrape has run → hide for the rest of the day and stop checking.
        try {
          localStorage.setItem(HIDE_KEY, today);
        } catch {
          /* ignore */
        }
      } else {
        // Not scraped yet → still showing the previous close.
        setVisible(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(HIDE_KEY, bstDateStr());
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="shrink-0 w-full"
      style={{
        background: "color-mix(in srgb, var(--primary) 8%, var(--surface))",
        borderBottom: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
      }}
    >
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-2 flex items-center gap-2.5">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
          style={{ color: "var(--primary-ink)" }}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <p className="flex-1 text-xs sm:text-sm leading-snug" style={{ color: "var(--text)" }}>
          Live prices update after market close. You&apos;re seeing the last closing price — today&apos;s
          close appears after 2:30 PM.
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notice"
          className="shrink-0 inline-flex items-center justify-center rounded-md p-1 transition-colors hover:bg-black/5"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
