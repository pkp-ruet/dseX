"use client";

import { useMemo } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import type { NotificationItem, PortfolioHolding, ScoreItem } from "@/lib/api";
import { changePct, changeTone, money } from "@/lib/formatters";
import { FEED_KIND, dhakaDay } from "@/lib/feed";
import { daysFrom, whenWord, type Bi, type DateItem } from "@/lib/home-dates";
import { shortName } from "@/lib/market-notices";
import { IconChevronRight } from "@/components/ui/icons";

/** Shares shown before "All your shares". */
const ROWS = 5;
/** A feed row counts as this share's news for this many days. */
const NEWS_DAYS = 3;

interface Row {
  code: string;
  name: string;
  qty: number;
  value: number | null;
  price: number | null;
  change: number | null;
  status: { text: Bi; tone: "info" | "good" | "watch" | "bad" } | null;
}

/**
 * "Your shares" (2026-11-25, step 2 of the simplify review — the third of
 * the home's four blocks): the shares the reader owns (most money first),
 * then the ones they watch, five at most. Each row: the company, "You own
 * it" or "You watch it", today's price and move, and at most one plain status
 * — the next date on the share this week, else the newest open feed row from
 * the last three days (the same row Updates shows; a free reader's hidden ones
 * never name the share here either). No money since 2026-11-25: the row reads
 * like My shares' row (the money is on the portfolio and the band's button).
 * Every row opens the share's page; the foot opens My shares. Data already on
 * the page: no request of its own.
 */
export default function YourShares({
  lang,
  holdings,
  watchlist,
  priceMap,
  exMoves,
  shown,
  dates,
  todayIso,
}: {
  lang: Lang;
  holdings: PortfolioHolding[] | null;
  watchlist: string[];
  priceMap: Map<string, ScoreItem>;
  exMoves: Record<string, number> | undefined;
  /** The feed rows a reader may see (`visibleFeed(...).shown`). */
  shown: NotificationItem[];
  dates: DateItem[];
  todayIso: string;
}) {
  const bn = lang === "bn";
  const pick = (b: Bi) => (bn ? b.bn : b.en);

  const { rows, total } = useMemo(() => {
    const qty = new Map<string, number>();
    for (const h of holdings ?? []) {
      const c = h.trading_code.toUpperCase();
      qty.set(c, (qty.get(c) ?? 0) + h.qty);
    }
    const watched = watchlist.map((c) => c.toUpperCase()).filter((c) => !qty.has(c));
    const make = (code: string): Row => {
      const s = priceMap.get(code);
      const q = qty.get(code) ?? 0;
      const price = s?.ltp ?? null;
      const date = dates.find((d) => d.code === code);
      const news = shown.find(
        (i) => i.code === code && i.kind !== "letter" && daysFrom(dhakaDay(i.at), todayIso) <= NEWS_DAYS,
      );
      let status: Row["status"] = null;
      if (date) {
        const w = whenWord(todayIso, date.iso);
        status = { text: { en: `${w.en} · ${date.what.en}`, bn: `${w.bn} · ${date.what.bn}` }, tone: daysFrom(todayIso, date.iso) <= 1 ? "watch" : "info" };
      } else if (news) {
        const k = FEED_KIND[news.kind] ?? { en: "Update", bn: "খবর" };
        const tone = news.level === "good" ? "good" : news.level === "bad" ? "bad" : news.level === "watch" ? "watch" : "info";
        status = { text: { en: `New: ${k.en}`, bn: `নতুন: ${k.bn}` }, tone };
      }
      return {
        code,
        name: shortName(s?.company_name, code),
        qty: q,
        value: q > 0 && price != null ? q * price : null,
        price,
        change: exMoves?.[code] ?? s?.change_pct ?? null,
        status,
      };
    };
    const owned = [...qty.keys()].map(make).sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || a.code.localeCompare(b.code));
    const all = [...owned, ...watched.map(make)];
    return { rows: all.slice(0, ROWS), total: all.length };
  }, [holdings, watchlist, priceMap, exMoves, shown, dates, todayIso]);

  if (total === 0) return null;

  return (
    <section className={`hm-shares ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="your-shares">
      <div className="hm-head">
        <h2 className="hm-head-h">{bn ? "আপনার শেয়ার" : "Your shares"}</h2>
      </div>
      <div className="hm-tcard">
        <ul className="hm-slist">
          {rows.map((r) => (
            <li key={r.code}>
              <Link href={`/stock/${encodeURIComponent(r.code)}`} className="hm-srow2">
                <span className="hm-srow2-txt">
                  <span className="hm-srow2-name">{r.name}</span>
                  <span className="hm-srow2-sub">
                    {r.code} ·{" "}
                    {r.qty > 0 ? (bn ? "আপনার আছে" : "You own it") : bn ? "নজরে রাখছেন" : "You watch it"}
                  </span>
                  {r.status && <span className={`hm-st hm-st--${r.status.tone}`}>{pick(r.status.text)}</span>}
                </span>
                <span className="hm-srow2-num nums">
                  <span className="hm-srow2-val">{money(r.price)}</span>
                  <span className={`hm-srow2-chg ${changeTone(r.change)}`}>{changePct(r.change)}</span>
                </span>
                <span className="hm-chev" aria-hidden>
                  <IconChevronRight size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/my" className="hm-dmore hm-ours-all">
          {bn ? `আপনার সব ${total}টি শেয়ার` : `All your ${total} ${total === 1 ? "share" : "shares"}`}
          <IconChevronRight size={16} />
        </Link>
      </div>
    </section>
  );
}
