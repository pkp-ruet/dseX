"use client";

import { useMemo } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import type { CorporateActionEvent, LatestResultRow, ScoreItem, UpcomingResult, WatchlistNewsItem } from "@/lib/api";
import { KIND_WORD, readNotice, shortName, type NoticeKind } from "@/lib/market-notices";
import { RESULT_LEVEL } from "@/lib/results";
import { buildDates, daysFrom, whenWord, type Bi, type DateItem } from "@/lib/home-dates";
import { DateTile } from "@/components/dividend-calendar/DateGroup";
import { IconChevronRight } from "@/components/ui/icons";

/** Newest updates shown before the link to Updates. */
const NEWS_ROWS = 3;
/** Dates shown before the link to Updates. */
const DATE_ROWS = 3;
/** A result counts as news for this many days. */
const RESULT_DAYS = 7;
/** A notice counts as news for this many days. */
const NOTICE_DAYS = 14;

/** Notice kinds the dates already say (board meetings, trading around a record date). */
const LEFT_OUT = new Set<NoticeKind>(["board", "record", "results"]);
const WARN = new Set<NoticeKind>(["auditor"]);

interface NewsItem {
  key: string;
  iso: string;
  code: string;
  name: string;
  kind: Bi;
  warn: boolean;
  text: Bi;
  href: string;
}

/**
 * "On your shares" (2026-11-20, the app map — block 4 of the six-block home):
 * a window into Updates. The newest three things on the reader's own shares
 * (results posted this week, then notices to DSE read as plain sentences) and
 * this week's dates (results meetings, last day to buy, record dates, AGMs),
 * then one link to Updates for everything. It replaced four blocks: "Your
 * dates this week", "Latest on your shares", "Results this week" and
 * "Dividends coming to you" (that one lives on the portfolio). Free. Data from
 * the home bundle — no request of its own. Renders nothing for a reader with
 * no shares and no watchlist.
 */
export default function OnYourShares({
  lang,
  mine,
  todayIso,
  news,
  results,
  resultsSoon,
  ownDividends,
  priceMap,
  loading,
}: {
  lang: Lang;
  /** Holdings ∪ watchlist, upper-case. */
  mine: Set<string>;
  todayIso: string;
  news: WatchlistNewsItem[];
  /** Results on the reader's own shares (bundle `new_results`). */
  results: LatestResultRow[];
  resultsSoon: UpcomingResult[];
  ownDividends: CorporateActionEvent[];
  priceMap: Map<string, ScoreItem>;
  loading: boolean;
}) {
  const bn = lang === "bn";
  const pick = (b: Bi) => (bn ? b.bn : b.en);

  const items = useMemo(() => {
    const out: NewsItem[] = [];
    for (const r of results) {
      const iso = (r.post_date || "").slice(0, 10);
      const code = r.code.toUpperCase();
      if (!iso || !mine.has(code) || daysFrom(iso, todayIso) > RESULT_DAYS) continue;
      const lvl = RESULT_LEVEL[r.level];
      out.push({
        key: `r-${code}-${iso}`,
        iso,
        code,
        name: shortName(r.name, code),
        kind: { en: `Results · ${lvl.short}`, bn: `আর্থিক ফল · ${lvl.shortBn}` },
        warn: r.level === "bad",
        text: { en: r.headline_en, bn: r.headline_bn || r.headline_en },
        href: `/stock/${encodeURIComponent(code)}#results`,
      });
    }
    const seen = new Set<string>();
    for (const n of news) {
      const code = (n.trading_code || "").trim().toUpperCase();
      const iso = (n.post_date || "").slice(0, 10);
      if (!code || !iso || !mine.has(code) || daysFrom(iso, todayIso) > NOTICE_DAYS) continue;
      const read = readNotice(n.title, code);
      if (!read || LEFT_OUT.has(read.kind)) continue;
      const key = `${code}|${read.text.en}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        key,
        iso,
        code,
        name: shortName(priceMap.get(code)?.company_name, code),
        kind: KIND_WORD[read.kind],
        warn: WARN.has(read.kind),
        text: read.text,
        href: `/stock/${encodeURIComponent(code)}#news`,
      });
    }
    return out.sort((a, b) => (a.iso === b.iso ? 0 : a.iso < b.iso ? 1 : -1));
  }, [results, news, mine, todayIso, priceMap]);

  const dates: DateItem[] = useMemo(
    () => (loading ? [] : buildDates(todayIso, resultsSoon, ownDividends)),
    [loading, todayIso, resultsSoon, ownDividends],
  );

  if (mine.size === 0) return null;
  if (!loading && items.length === 0 && dates.length === 0) {
    return (
      <section className={`hm-ours ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="on-your-shares">
        <div className="hm-head">
          <h2 className="hm-head-h">{bn ? "আপনার শেয়ারে" : "On your shares"}</h2>
        </div>
        <Link href="/notifications" className="hm-tcard hm-ours-quiet">
          <span>
            {bn
              ? "এ সপ্তাহে আপনার শেয়ারে নতুন কিছু বা কোনো তারিখ নেই। চুপচাপ সপ্তাহ স্বাভাবিক।"
              : "Nothing new and no dates on your shares this week. Quiet weeks are normal."}
          </span>
          <span className="hm-ours-all">{bn ? "সব আপডেট ›" : "All updates ›"}</span>
        </Link>
      </section>
    );
  }

  const total = items.length + dates.length;
  return (
    <section className={`hm-ours ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="on-your-shares">
      <div className="hm-head">
        <h2 className="hm-head-h">{bn ? "আপনার শেয়ারে" : "On your shares"}</h2>
        <span className="hm-head-note">{bn ? "নতুন খবর আর এ সপ্তাহের তারিখ" : "What's new, and this week's dates"}</span>
      </div>
      <div className="hm-tcard">
        {items.length > 0 && (
          <ul className="hm-nlist">
            {items.slice(0, NEWS_ROWS).map((r) => (
              <li key={r.key}>
                <Link href={r.href} className="hm-nrow">
                  <span className="hm-nrow-txt">
                    <span className="hm-nrow-top">
                      <span className={`hm-kind${r.warn ? " hm-kind--warn" : ""}`}>{pick(r.kind)}</span>
                      <span className="hm-nrow-co">{r.name}</span>
                      <span className="hm-nrow-day nums">{pick(whenWord(todayIso, r.iso))}</span>
                    </span>
                    <span className="hm-nrow-text">{pick(r.text)}</span>
                  </span>
                  <span className="hm-chev" aria-hidden>
                    <IconChevronRight size={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {dates.length > 0 && (
          <ul className="hm-dlist hm-ours-dates">
            {dates.slice(0, DATE_ROWS).map((d) => (
              <li key={`${d.code}-${d.iso}-${d.what.en}`}>
                <Link href={d.href} className="hm-drow">
                  <DateTile iso={d.iso} small soon={daysFrom(todayIso, d.iso) <= 1} />
                  <span className="hm-drow-txt">
                    <b className="hm-drow-code">{d.code}</b>
                    <span className="hm-drow-what">
                      {pick(whenWord(todayIso, d.iso))} · {pick(d.what)}
                    </span>
                  </span>
                  <span className="hm-chev" aria-hidden>
                    <IconChevronRight size={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/notifications" className="hm-dmore hm-ours-all">
          {total > NEWS_ROWS + DATE_ROWS || items.length > NEWS_ROWS || dates.length > DATE_ROWS
            ? bn
              ? "আপডেটে সব দেখুন ›"
              : "See everything in Updates ›"
            : bn
              ? "সব আপডেট ›"
              : "All updates ›"}
        </Link>
      </div>
    </section>
  );
}
