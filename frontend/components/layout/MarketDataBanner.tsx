"use client";

import { useEffect, useState } from "react";
import { isTradingDay, isAfterOpen, isMarketOpen, bstDateStr } from "@/lib/market-hours";

const DISMISS_KEY = "dsex.market-banner-dismissed";

/**
 * Prices are only refreshed after market close, so during a live trading day the
 * site shows the previous session's close. Decide whether to surface that.
 *
 * - With a known `marketDate`: show from open until today's prices have loaded
 *   (i.e. the latest scraped date is still behind today). Auto-hides once the
 *   post-close scrape lands today's data.
 * - Without it (API hiccup): fall back to the live-session clock only, where the
 *   data is unambiguously a previous close.
 */
function shouldShow(marketDate: string | null): boolean {
  if (!isTradingDay()) return false;
  if (marketDate) return isAfterOpen() && marketDate !== bstDateStr();
  return isMarketOpen();
}

export default function MarketDataBanner({ marketDate }: { marketDate: string | null }) {
  // Start hidden so the server render and first client render match; reveal after
  // mount once the clock + dismissal state (localStorage) are known.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldShow(marketDate)) return;
    let dismissedToday = false;
    try {
      dismissedToday = localStorage.getItem(DISMISS_KEY) === bstDateStr();
    } catch {
      /* localStorage unavailable — show anyway */
    }
    if (!dismissedToday) setVisible(true);
  }, [marketDate]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, bstDateStr());
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
