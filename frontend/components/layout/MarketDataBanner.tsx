"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { bnDate } from "@/lib/bn";
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
 * "Last updated" strip — only lives during the open session (10:00–2:30 BST):
 *  - At the open the site is still serving the previous session, so it reads
 *    "last updated <previous trading day> at 2:30 PM".
 *  - When the quick scrape lands today's data it flips to that actual run time
 *    ("last updated today at 2:05 PM"). Polled every minute, no reload needed.
 *  - Gone after the 2:30 close, before the open, and on non-trading days.
 *
 * It is a single 28px line (`.market-strip`, app/styles/nav.css), not a 36px
 * bar — it shares the phone with a 56px navbar, the stock page's sticky stack
 * and a 60px bottom bar. Dismiss removes it for the rest of the day.
 */
export default function MarketDataBanner() {
  // Start hidden so SSR and the first client render match; the effect decides.
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<{ en: string; bn: string } | null>(null);
  const { bn } = useLang();

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

      let when: { en: string; bn: string };
      if (marketDate && marketDate === today && scrapedAt) {
        const t = formatBstTimeLabel(scrapedAt);
        when = t ? { en: `today at ${t}`, bn: `আজ ${t}-এ` } : { en: "today", bn: "আজ" };
      } else if (marketDate) {
        // Still serving the previous session — present it as that day's 2:30 close.
        when = {
          en: `${formatBstDateLabel(marketDate)} at 2:30 PM`,
          bn: `${bnDate(marketDate) || formatBstDateLabel(marketDate)}, বেলা 2:30-এ`,
        };
      } else {
        when = { en: "at the last market close", bn: "বাজারের শেষ সময়ে" };
      }
      setLabel(when);
      setVisible(true);
    };

    // Every open tab polled once a minute, visible or not. The data changes at
    // most a few times a session, so poll every 5 minutes, skip hidden tabs and
    // catch up when the tab comes back.
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    const id = setInterval(tick, 5 * 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
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
      className="market-strip shrink-0 w-full bg-primary/10 border-b border-primary/20"
    >
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 flex items-center gap-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-primary-ink"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <p className="flex-1 min-w-0 truncate text-xs leading-none text-text-main">
          <T
            en={
              <>
                Prices were last updated <strong className="font-semibold">{label.en}</strong>. New prices are on
                the way.
              </>
            }
            bn={
              <>
                দাম সর্বশেষ হালনাগাদ হয়েছে <strong className="font-semibold">{label.bn}</strong>। নতুন দাম শিগগিরই
                আসছে।
              </>
            }
          />
        </p>
        {/* 40px tap target inside a 28px strip: negative vertical margin */}
        <button
          type="button"
          onClick={dismiss}
          aria-label={bn ? "বার্তাটি বন্ধ করুন" : "Close this notice"}
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 -my-2 -mr-2 rounded-md text-text-muted hover:text-text-main hover:bg-primary/10 active:bg-primary/20 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
