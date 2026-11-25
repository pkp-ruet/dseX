"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import type { ScoreItem } from "@/lib/api";
import { readRecentStocks, RECENT_EVENT } from "@/lib/recent-stocks";
import { changePct, changeTone } from "@/lib/formatters";

/** Chips shown; the device keeps ten. */
const SHOW = 5;

/**
 * "Recently opened" under the band's search (2026-11-25, the fuller home,
 * addition A): the last shares opened on this phone, with today's move, one
 * tap back to their page. A stock page is opened on 52% of the days a reader
 * comes (page views 4–25 Nov). The list is written by every stock page
 * (`StockVisitTracker` → `lib/recent-stocks.ts`) and lives on the device only.
 * Nothing renders until a share has been opened here.
 */
export default function RecentShares({ lang, priceMap }: { lang: Lang; priceMap: Map<string, ScoreItem> }) {
  const bn = lang === "bn";
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    const read = () => setCodes(readRecentStocks().slice(0, SHOW));
    read();
    window.addEventListener(RECENT_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(RECENT_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  if (codes.length === 0) return null;

  return (
    <section className={`hm-recent ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="recent">
      <h2 className="hm-recent-h">{bn ? "সম্প্রতি দেখেছেন" : "Recently opened"}</h2>
      <ul className="hm-recent-list">
        {codes.map((code) => {
          const chg = priceMap.get(code)?.change_pct ?? null;
          return (
            <li key={code}>
              <Link href={`/stock/${encodeURIComponent(code)}`} className="hm-rchip">
                <span className="hm-rchip-c">{code}</span>
                {chg != null && <span className={`hm-rchip-m nums ${changeTone(chg)}`}>{changePct(chg)}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
