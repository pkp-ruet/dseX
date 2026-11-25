"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { bnDate } from "@/lib/bn";
import { bstDateStr, formatBstDateLabel } from "@/lib/market-hours";
import { usePriceTime } from "@/lib/use-price-time";

// Date string ("YYYY-MM-DD") for which the banner is suppressed after a manual
// dismiss. Date-keyed so it resets by itself the next day.
const HIDE_KEY = "dsex.market-banner-hidden";

/**
 * "Last updated" strip — only lives during the open session (10:00–2:30 BST):
 *  - At the open the site is still serving the previous session, so it reads
 *    "last updated <previous trading day> at 2:30 PM".
 *  - When the quick scrape lands today's data it flips to that actual run time
 *    ("last updated today at 2:05 PM"). Polled, no reload needed
 *    (`lib/use-price-time.ts`).
 *  - Gone after the 2:30 close, before the open, and on non-trading days.
 *
 * It is a single 28px line (`.market-strip`, app/styles/nav.css), not a 36px
 * bar — it shares the phone with a 56px navbar, the stock page's sticky stack
 * and a 60px bottom bar. Dismiss removes it for the rest of the day.
 *
 * Not on the signed-in home (2026-11-25, user: the top of the home was
 * noisy): its date line says the same time ("Open · prices at 1:42 PM").
 * Guests on the home still get the strip.
 */
export default function MarketDataBanner() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { bn } = useLang();
  // Client-only checks; the strip starts hidden so SSR and hydration match.
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(HIDE_KEY) === bstDateStr());
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // While /me is still answering, trust the mark the boot script put on <html>.
  const signedIn =
    !!user || (ready && isLoading && document.documentElement.getAttribute("data-signed-in") === "1");
  const onSignedInHome = pathname === "/" && signedIn;
  const time = usePriceTime(ready && !dismissed && !onSignedInHome);

  if (!time) return null;

  let label: { en: string; bn: string };
  if (time.kind === "today") {
    label = time.time ? { en: `today at ${time.time}`, bn: `আজ ${time.time}-এ` } : { en: "today", bn: "আজ" };
  } else if (time.kind === "earlier") {
    // Still serving the previous session — present it as that day's 2:30 close.
    label = {
      en: `${formatBstDateLabel(time.date)} at 2:30 PM`,
      bn: `${bnDate(time.date) || formatBstDateLabel(time.date)}, বেলা 2:30-এ`,
    };
  } else {
    label = { en: "at the last market close", bn: "বাজারের শেষ সময়ে" };
  }

  const dismiss = () => {
    setDismissed(true);
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
