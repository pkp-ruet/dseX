"use client";

import { useEffect, useState } from "react";
import { T } from "@/components/i18n/T";
import SectionHeader from "@/components/ui/SectionHeader";
import { useAuth } from "@/context/AuthContext";
import { apiGetNotifications, getDividendCalendar } from "@/lib/api";
import { heldQty, loadMainHoldings } from "@/lib/main-holdings";
import { money } from "@/lib/formatters";
import { THREE_PROMISES } from "@/lib/premium-copy";

const TAX = 0.1;
const WATCH_KINDS = new Set(["results", "grade", "red_flag", "record", "category", "drop", "low52", "breakeven", "rule", "price_view"]);

type Mine = {
  shares: number;
  /** Cash coming from declared dividends on their shares, after tax. */
  cash: number;
  cashShares: number;
  /** What the watcher told them in the last 7 days. */
  updates: number;
};

/** The reader's own figures for the three promises: their shares, the
 *  dividends coming to them, and what the watcher found this week. */
function useMine(): Mine | null {
  const { isLoggedIn } = useAuth();
  const [mine, setMine] = useState<Mine | null>(null);
  useEffect(() => {
    if (!isLoggedIn) return;
    let live = true;
    Promise.all([
      loadMainHoldings().catch(() => []),
      getDividendCalendar().catch(() => null),
      apiGetNotifications().catch(() => null),
    ]).then(([holdings, cal, feed]) => {
      if (!live) return;
      const qty = heldQty(holdings);
      let cash = 0;
      const paying = new Set<string>();
      for (const e of cal?.record_dates ?? []) {
        const q = qty.get(e.trading_code.toUpperCase());
        if (!q || !e.cash_per_share || (e.record_days_left ?? -1) < 0) continue;
        cash += q * e.cash_per_share * (1 - TAX);
        paying.add(e.trading_code.toUpperCase());
      }
      const weekAgo = Date.now() - 7 * 86_400_000;
      const updates = (feed?.items ?? []).filter((i) => WATCH_KINDS.has(i.kind) && Date.parse(i.at) >= weekAgo).length;
      setMine({ shares: qty.size, cash, cashShares: paying.size, updates });
    });
    return () => {
      live = false;
    };
  }, [isLoggedIn]);
  return mine;
}

/**
 * THE Premium line, step 7 (2026-11-22): the Premium page leads with three
 * promises, each with the reader's own figures when we have them — what is
 * coming to their shares, what we check on what they own, and our analysis
 * before they buy. The plain list of everything in Premium follows it.
 */
export default function PremiumPromises() {
  const mine = useMine();
  const have = mine && mine.shares > 0;

  const own: (null | { en: string; bn: string })[] = [
    have && (mine.cash > 0 || mine.updates > 0)
      ? {
          en: [
            mine.cash > 0 ? `${money(mine.cash)} is coming to ${mine.cashShares} of your shares from dividends already declared, after tax.` : "",
            mine.updates > 0 ? `We found ${mine.updates} ${mine.updates === 1 ? "thing" : "things"} on your shares this week.` : "",
          ].filter(Boolean).join(" "),
          bn: [
            mine.cash > 0 ? `ইতিমধ্যে ঘোষিত ডিভিডেন্ড থেকে আপনার ${mine.cashShares}টি শেয়ারে ${money(mine.cash)} আসছে, কর কাটার পর।` : "",
            mine.updates > 0 ? `এ সপ্তাহে আপনার শেয়ারে আমরা ${mine.updates}টি বিষয় পেয়েছি।` : "",
          ].filter(Boolean).join(" "),
        }
      : null,
    have
      ? {
          en: `Your ${mine.shares} ${mine.shares === 1 ? "share" : "shares"}, checked after every close.`,
          bn: `আপনার ${mine.shares}টি শেয়ার, প্রতিদিন বাজার বন্ধের পর যাচাই করা।`,
        }
      : null,
    null,
  ];

  return (
    <section aria-labelledby="promise-h" className="pm-section pm-three">
      <SectionHeader id="promise-h" size="lg" title={<T en="What Premium does for you" bn="প্রিমিয়াম আপনার জন্য যা করে" />} />
      <ol className="pm-three-list">
        {THREE_PROMISES.map((p, i) => (
          <li key={p.key} className="pm-three-item">
            <span className="pm-three-n" aria-hidden>{i + 1}</span>
            <div className="min-w-0">
              <h3 className="pm-three-h">
                <T en={p.title.en} bn={p.title.bn} />
              </h3>
              <p className="pm-three-line">
                <T en={p.line.en} bn={p.line.bn} />
              </p>
              {own[i] && (
                <p className="pm-three-own pv">
                  <T en={own[i]!.en} bn={own[i]!.bn} />
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
