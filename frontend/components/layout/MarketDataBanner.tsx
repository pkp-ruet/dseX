"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import {
  isMarketOpen,
  bstDateStr,
  formatBstDateLabel,
  formatBstTimeLabel,
} from "@/lib/market-hours";

// Date string ("YYYY-MM-DD") for which the banner is suppressed after a manual
// dismiss. Date-keyed so it resets by itself the next day.
const HIDE_KEY = "dsex.market-banner-hidden";

/**
 * "Last updated" banner — only lives during the open session (10:00–2:30 BST):
 *  - At the open the site is still serving the previous session, so it reads
 *    "last updated <previous trading day> at 2:30 PM".
 *  - When the quick scrape lands today's data it flips to that actual run time
 *    ("last updated today at 2:05 PM"). Polled every minute, no reload needed.
 *  - Gone after the 2:30 close, before the open, and on non-trading days.
 */
export default function MarketDataBanner() {
  // Start hidden so SSR and the first client render match; the effect decides.
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const isDismissed = () => {
      try {
        return localStorage.getItem(HIDE_KEY) === bstDateStr();
      } catch {
        return false;
      }
    };

    const refresh = async () => {
      // Banner lives only during the open session; gone after the 2:30 close.
      if (!isMarketOpen() || isDismissed()) {
        if (!cancelled) setVisible(false);
        return;
      }

      const today = bstDateStr();
      let marketDate: string | null = null;
      let scrapedAt: string | null = null;
      try {
        const res = await fetch(`${getApiUrl()}/api/market-index`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { date?: string | null; scraped_at?: string | null };
          marketDate = data?.date ?? null;
          scrapedAt = data?.scraped_at ?? null;
        }
      } catch {
        /* network error — fall back to the generic prev-close label below */
      }
      if (cancelled) return;

      let when: string;
      if (marketDate && marketDate === today && scrapedAt) {
        const t = formatBstTimeLabel(scrapedAt);
        when = t ? `today at ${t}` : "today";
      } else if (marketDate) {
        // Still serving the previous session — present it as that day's 2:30 close.
        when = `${formatBstDateLabel(marketDate)} at 2:30 PM`;
      } else {
        when = "at the last market close";
      }
      setLabel(when);
      setVisible(true);
    };

    refresh();
    const id = setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!visible || !label) return null;

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
          Prices last updated <strong style={{ fontWeight: 600 }}>{label}</strong>. Price will be
          updated soon.
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
