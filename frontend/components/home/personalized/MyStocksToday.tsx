"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  LatestResultRow,
  MarketUnusualStock,
  PortfolioHolding,
  ScoreItem,
  WatchlistNewsItem,
} from "@/lib/api";
import type { HomeAlert, HomeAlertKind, HomeAlertTone } from "@/lib/home-alerts";
import type { Lang } from "@/context/LangContext";
import { changePct, changeTone, formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { t } from "@/lib/home-copy";
import { RESULT_LEVEL } from "@/lib/results";
import { classifyNews } from "@/lib/news-kind";
import { TIER_THRESHOLDS } from "@/lib/constants";
import DashHeader from "@/components/home/personalized/DashHeader";
import { OwnerTag } from "@/components/home/personalized/OwnerMark";
import {
  IconArrowDown,
  IconArrowUp,
  IconChartBars,
  IconChevron,
  IconCoin,
  IconFlame,
  IconList,
  IconNews,
  IconSparkle,
  IconTarget,
  IconTrendDown,
  IconTrendUp,
  IconWallet,
} from "@/components/ui/icons";

const MAX_POINTS = 6;
const MAX_NEWS = 3;
const NEWS_DAYS = 7;

/** Order of the key points, most important first. Alerts from
 *  `buildHomeAlerts` keep their own order inside a rank (the sort is stable).
 *  Kinds not listed (the portfolio-wide move — the money card shows it) are
 *  dropped. */
const RANK: Partial<Record<HomeAlertKind, number>> = {
  target: 0,
  signal: 1,
  screen: 2,
  results: 3,
  mover: 4,
  volume: 5,
  high: 6,
  low: 6,
  dividend: 7,
  news: 8,
};

/** The day across everything the reader follows (holdings ∪ watchlist). */
export interface StocksDay {
  /** Followed stocks with a move to count. */
  n: number;
  up: number;
  down: number;
  flat: number;
  /** The biggest riser / faller — only when one actually rose / fell. */
  best: ScoreItem | null;
  worst: ScoreItem | null;
  /** Where they stand now: Buy (or Buy More on a holding) / Sell, and grades. */
  buy: string[];
  sell: string[];
  scored: number;
  goodPlus: number;
  weak: number;
}

function stocksDay(
  codes: string[],
  priceMap: Map<string, ScoreItem>,
  holdings: PortfolioHolding[] = [],
): StocksDay {
  const items = Array.from(new Set(codes.map((c) => c.toUpperCase())))
    .map((c) => priceMap.get(c))
    .filter((s): s is ScoreItem => !!s);
  const priced = items.filter((s) => s.change_pct != null);
  const sorted = [...priced].sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0));
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  // A holding's own overlay wins (Buy More / Sell for the owner); a watched
  // stock reads the canonical signal.
  const own = new Map(holdings.map((h) => [h.trading_code.toUpperCase(), h.signal?.signal ?? "none"]));
  const buy: string[] = [];
  const sell: string[] = [];
  for (const s of items) {
    const code = s.trading_code.toUpperCase();
    const mine = own.get(code);
    const sig = mine && mine !== "none" ? mine : s.signal?.signal ?? "none";
    if (sig === "buy" || sig === "buy_more") buy.push(s.trading_code);
    else if (sig === "sell") sell.push(s.trading_code);
  }
  const scored = items.filter((s) => s.score != null);

  return {
    n: priced.length,
    up: priced.filter((s) => (s.change_pct ?? 0) > 0).length,
    down: priced.filter((s) => (s.change_pct ?? 0) < 0).length,
    flat: priced.filter((s) => s.change_pct === 0).length,
    best: top && (top.change_pct ?? 0) > 0 ? top : null,
    worst: bottom && (bottom.change_pct ?? 0) < 0 ? bottom : null,
    buy,
    sell,
    scored: scored.length,
    goodPlus: scored.filter((s) => (s.score ?? 0) >= TIER_THRESHOLDS.GOOD).length,
    weak: scored.filter((s) => (s.score ?? 0) < TIER_THRESHOLDS.AVERAGE).length,
  };
}

/**
 * The key points under the day line — and the count in the greeting's
 * "N updates" line. The alerts from `buildHomeAlerts` plus three things only
 * the dashboard has: new quarterly results on the reader's stocks, unusual
 * trading on them today, and their latest news. A big-move row for a stock
 * already shown as the day's riser / faller is dropped, and a results /
 * dividend headline isn't repeated as news when its own row is there.
 */
function keyPoints(opts: {
  alerts: HomeAlert[];
  days: StocksDay[];
  followed: Set<string>;
  results?: LatestResultRow[];
  unusual?: MarketUnusualStock[];
  news?: WatchlistNewsItem[];
  lang?: Lang;
}): HomeAlert[] {
  const { alerts, days, followed, results = [], unusual = [], news = [] } = opts;
  const bn = opts.lang === "bn";
  const tiles = new Set(
    days.flatMap((d) => [d.best?.trading_code, d.worst?.trading_code]).filter(Boolean).map((c) => c!.toUpperCase()),
  );
  const out: HomeAlert[] = alerts.filter(
    (a) => RANK[a.kind] != null && a.kind !== "news" && !(a.kind === "mover" && a.code && tiles.has(a.code.toUpperCase())),
  );

  const when = (iso: string) => (bn ? bnDate(iso) : formatDate(iso));
  const resultCodes = new Set<string>();
  for (const r of results) {
    const code = r.code.toUpperCase();
    if (!followed.has(code) || resultCodes.has(code)) continue;
    resultCodes.add(code);
    const level = RESULT_LEVEL[r.level];
    const tone: HomeAlertTone = r.level === "good" ? "positive" : r.level === "bad" ? "negative" : "neutral";
    out.push({
      id: `rs:${code}:${r.post_date}`,
      kind: "results",
      code: r.code,
      emoji: "📊",
      title: `${r.code} ${bn ? r.headline_bn : r.headline_en}`,
      detail: bn ? `${level.bn} · প্রকাশ ${when(r.post_date)}` : `${level.en} · posted ${when(r.post_date)}`,
      href: `/stock/${encodeURIComponent(r.code)}#results`,
      tone,
    });
  }

  for (const u of unusual) {
    const code = u.trading_code.toUpperCase();
    if (!followed.has(code) || !(u.volume_ratio > 1)) continue;
    const x = u.volume_ratio.toFixed(1);
    const move = u.change_pct != null ? changePct(u.change_pct) : null;
    out.push({
      id: `vo:${code}`,
      kind: "volume",
      code: u.trading_code,
      emoji: "🔥",
      title: bn ? `${u.trading_code}-এ স্বাভাবিকের ${x} গুণ লেনদেন` : `${u.trading_code} traded ${x}× its usual amount`,
      detail: [u.company_name, move].filter(Boolean).join(" · ") || undefined,
      href: `/stock/${u.trading_code}`,
      tone: u.change_pct != null && u.change_pct < 0 ? "negative" : u.change_pct != null && u.change_pct > 0 ? "positive" : "neutral",
    });
  }

  const divCodes = new Set(out.filter((a) => a.kind === "dividend" && a.code).map((a) => a.code!.toUpperCase()));
  const cutoff = Date.now() - NEWS_DAYS * 24 * 60 * 60 * 1000;
  let newsN = 0;
  for (const n of news) {
    if (newsN >= MAX_NEWS) break;
    const code = n.trading_code.toUpperCase();
    if (!followed.has(code)) continue;
    const ts = Date.parse(n.post_date);
    if (!Number.isNaN(ts) && ts < cutoff) continue;
    const kind = classifyNews(n.title);
    if (kind.key === "earnings" && resultCodes.has(code)) continue;
    if ((kind.key === "dividend" || kind.key === "record") && divCodes.has(code)) continue;
    newsN += 1;
    out.push({
      id: `nw:${code}:${n.post_date}:${n.title.slice(0, 48)}`,
      kind: "news",
      code: n.trading_code,
      emoji: "📰",
      title: n.title,
      detail: [n.trading_code, bn ? kind.labelBn : kind.label, Number.isNaN(ts) ? null : when(n.post_date)]
        .filter(Boolean)
        .join(" · "),
      href: `/stock/${n.trading_code}#news`,
      tone: kind.key === "sensitive" ? "negative" : "neutral",
    });
  }

  return out
    .map((a, i) => ({ a, i }))
    .sort((x, y) => (RANK[x.a.kind] ?? 9) - (RANK[y.a.kind] ?? 9) || x.i - y.i)
    .map((x) => x.a);
}

/** One section of the card: the reader's portfolio, their watchlist (stocks
 *  they also own sit under the portfolio only), or the few updates that are
 *  about no stock of theirs (new names on a saved screen). */
export interface StocksSection {
  kind: "portfolio" | "watchlist" | "other";
  /** Stocks in the section. */
  count: number;
  /** Watchlist only: followed stocks left out because they're in the portfolio. */
  alsoOwned: number;
  day: StocksDay | null;
  points: HomeAlert[];
}

/** Everything the card shows, split by where the stock lives. The greeting's
 *  "N updates" line counts the points across every section. */
export function buildStocksToday(opts: {
  holdings: PortfolioHolding[];
  watchlist: string[];
  priceMap: Map<string, ScoreItem>;
  alerts: HomeAlert[];
  results?: LatestResultRow[];
  unusual?: MarketUnusualStock[];
  news?: WatchlistNewsItem[];
  lang?: Lang;
}): StocksSection[] {
  const held = new Set(opts.holdings.map((h) => h.trading_code.toUpperCase()));
  const watched = new Set(opts.watchlist.map((c) => c.toUpperCase()));
  const watchOnly = Array.from(watched).filter((c) => !held.has(c));
  const pDay = stocksDay(Array.from(held), opts.priceMap, opts.holdings);
  const wDay = stocksDay(watchOnly, opts.priceMap);
  const points = keyPoints({
    alerts: opts.alerts,
    days: [pDay, wDay],
    followed: new Set([...held, ...watched]),
    results: opts.results,
    unusual: opts.unusual,
    news: opts.news,
    lang: opts.lang,
  });
  const owned = (a: HomeAlert) => !!a.code && held.has(a.code.toUpperCase());
  const watchedPt = (a: HomeAlert) => !!a.code && !held.has(a.code.toUpperCase()) && watched.has(a.code.toUpperCase());

  const out: StocksSection[] = [];
  if (held.size > 0) {
    out.push({ kind: "portfolio", count: held.size, alsoOwned: 0, day: pDay, points: points.filter(owned) });
  }
  if (watchOnly.length > 0) {
    out.push({
      kind: "watchlist",
      count: watchOnly.length,
      alsoOwned: watched.size - watchOnly.length,
      day: wDay,
      points: points.filter(watchedPt),
    });
  }
  const other = points.filter((a) => !owned(a) && !watchedPt(a));
  if (other.length > 0) out.push({ kind: "other", count: 0, alsoOwned: 0, day: null, points: other });
  return out;
}

/** One SVG per point kind — the row's tone colours it. */
function KindIcon({ kind, tone }: { kind: HomeAlertKind; tone: HomeAlert["tone"] }) {
  const up = tone === "positive";
  switch (kind) {
    case "target":
      return <IconTarget size={16} />;
    case "signal":
      return <IconSparkle size={16} />;
    case "portfolio":
      return <IconWallet size={16} />;
    case "mover":
      return up ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />;
    case "high":
      return <IconArrowUp size={16} />;
    case "low":
      return <IconArrowDown size={16} />;
    case "dividend":
      return <IconCoin size={16} />;
    case "screen":
      return <IconList size={16} />;
    case "results":
      return <IconChartBars size={16} />;
    case "volume":
      return <IconFlame size={16} />;
    case "news":
    default:
      return <IconNews size={16} />;
  }
}

/** "Rose most" / "Fell most" — one linked half of the day's two extremes. */
function DayTile({ label, item }: { label: string; item: ScoreItem }) {
  return (
    <Link
      prefetch={false}
      href={`/stock/${item.trading_code}`}
      className="block min-w-0 px-3 py-2 transition-colors hover:bg-surface-2 active:bg-surface-2"
    >
      <span className="block text-xs text-text-muted">{label}</span>
      <span className="block truncate text-sm font-semibold text-text-main">
        {item.company_name ?? item.trading_code}
      </span>
      <span className="flex items-baseline gap-1.5 text-xs">
        <span className="font-semibold text-text-muted">{item.trading_code}</span>
        <span className={`font-semibold tabular-nums nums ${changeTone(item.change_pct)}`}>
          {changePct(item.change_pct)}
        </span>
      </span>
    </Link>
  );
}

/** One cell of the "Right now" strip: a count, its label, the codes under it. */
function NowCell({
  value,
  label,
  codes,
  sub,
  tone,
  lang,
}: {
  value: string;
  label: string;
  codes?: string[];
  sub?: string;
  tone: string;
  lang: Lang;
}) {
  const list = codes && codes.length > 0 ? codes.slice(0, 3).join(", ") + (codes.length > 3 ? "…" : "") : null;
  return (
    <div className="min-w-0 px-3 py-2">
      <span className={`block text-xl font-bold leading-none tabular-nums nums ${tone}`}>{value}</span>
      <span className="mt-1 block text-xs font-semibold text-text-muted">{label}</span>
      <span className="mt-0.5 block truncate text-xs text-text-main">
        {list ?? sub ?? (codes ? t(lang, "nowNone") : "")}
      </span>
    </div>
  );
}

/** The day line, the bar and the riser / faller tiles for one section. */
function DayBlock({ day, when, lang }: { day: StocksDay; when: "today" | "last"; lang: Lang }) {
  const pct = (n: number) => `${(n / day.n) * 100}%`;
  return (
    <div className="px-4 pt-3 sm:px-5">
      <p className="text-sm font-semibold text-text-main">
        {t(lang, when === "last" ? "stocksDayLast" : "stocksDay", { up: day.up, down: day.down, n: day.n })}
      </p>
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <span className="bg-positive" style={{ width: pct(day.up) }} />
        <span className="bg-border" style={{ width: pct(day.flat) }} />
        <span className="bg-negative" style={{ width: pct(day.down) }} />
      </div>
      <p className="mt-1 text-xs text-text-muted tabular-nums nums">
        {t(lang, "upFlatDown", { up: day.up, flat: day.flat, down: day.down })}
      </p>
      {(day.best || day.worst) && (
        <div className="mt-3 grid grid-cols-2 divide-x divide-border overflow-hidden rounded-md border border-border">
          {day.best && <DayTile label={t(lang, "bestToday")} item={day.best} />}
          {day.worst && <DayTile label={t(lang, "worstToday")} item={day.worst} />}
        </div>
      )}
    </div>
  );
}

/** Buy · Sell · grades for one section. */
function NowBlock({ day, lang }: { day: StocksDay; lang: Lang }) {
  return (
    <div className="mt-3">
      <p className="px-4 text-xs font-semibold text-text-muted sm:px-5">{t(lang, "rightNow")}</p>
      <div className="grid grid-cols-3 divide-x divide-border px-1 sm:px-2">
        <NowCell
          value={String(day.buy.length)}
          label={t(lang, "nowBuy")}
          codes={day.buy}
          tone={day.buy.length ? "text-positive" : "text-text-muted"}
          lang={lang}
        />
        <NowCell
          value={String(day.sell.length)}
          label={t(lang, "nowSell")}
          codes={day.sell}
          tone={day.sell.length ? "text-negative" : "text-text-muted"}
          lang={lang}
        />
        <NowCell
          value={t(lang, "nowOf", { a: day.goodPlus, b: day.scored })}
          label={t(lang, "nowGood")}
          sub={day.weak > 0 ? t(lang, "nowWeak", { n: day.weak }) : undefined}
          tone="text-text-main"
          lang={lang}
        />
      </div>
    </div>
  );
}

/** The key points of one section, `MAX_POINTS` shown + "Show N more". */
function PointList({ points, label, lang }: { points: HomeAlert[]; label?: string; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const shown = open ? points : points.slice(0, MAX_POINTS);
  return (
    <div className="mt-3">
      {label && <p className="px-4 text-xs font-semibold text-text-muted sm:px-5">{label}</p>}
      <ul className="divide-y divide-cell-rule">
        {shown.map((a) => {
          const toneColor =
            a.tone === "positive" ? "text-positive" : a.tone === "negative" ? "text-negative" : "text-primary";
          const inner = (
            <>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface-2 ${toneColor}`}
                aria-hidden
              >
                <KindIcon kind={a.kind} tone={a.tone} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm font-semibold leading-snug text-text-main">{a.title}</span>
                {a.detail && (
                  <span
                    className={`block truncate text-xs font-medium ${a.kind === "news" ? "text-text-muted" : toneColor}`}
                  >
                    {a.detail}
                  </span>
                )}
              </span>
              {a.href && (
                <span className="shrink-0 text-text-muted">
                  <IconChevron size={15} />
                </span>
              )}
            </>
          );
          return (
            <li key={a.id}>
              {a.href ? (
                <Link
                  prefetch={false}
                  href={a.href}
                  className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-surface-2 active:bg-surface-2 sm:px-5"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex items-center gap-2.5 px-4 py-2.5 sm:px-5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {points.length > MAX_POINTS && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="block min-h-10 w-full border-t border-border px-4 py-2.5 text-center text-xs font-semibold text-primary transition-colors hover:bg-surface-2 active:bg-surface-2"
        >
          {open ? t(lang, "showFewer") : t(lang, "showMorePoints", { n: points.length - MAX_POINTS })}
        </button>
      )}
    </div>
  );
}

/** One section: a labelled band (H Your portfolio · 5 stocks / ★ Your
 *  watchlist · 8 stocks), then its day, right now and what happened. */
function Section({ sec, when, lang }: { sec: StocksSection; when: "today" | "last"; lang: Lang }) {
  const day = sec.day;
  const title =
    sec.kind === "portfolio"
      ? t(lang, "secPortfolio")
      : sec.kind === "watchlist"
        ? t(lang, "secWatchlist")
        : t(lang, "otherPoints");
  return (
    <section className="border-t border-border pb-3 first-of-type:border-t-0">
      <div className="flex items-center gap-2 bg-surface-2 px-4 py-2 sm:px-5">
        {sec.kind !== "other" && <OwnerTag kind={sec.kind} lang={lang} />}
        <h4 className="text-sm font-bold text-text-main">{title}</h4>
        {sec.kind !== "other" && (
          <span className="text-xs text-text-muted tabular-nums nums">
            · {sec.count === 1 ? t(lang, "oneStock") : t(lang, "nStocks", { n: sec.count })}
          </span>
        )}
      </div>
      {sec.alsoOwned > 0 && (
        <p className="px-4 pt-2 text-xs text-text-muted sm:px-5">{sec.alsoOwned === 1 ? t(lang, "alsoOwnedOne") : t(lang, "alsoOwned", { n: sec.alsoOwned })}</p>
      )}
      {day && day.n > 0 && <DayBlock day={day} when={when} lang={lang} />}
      {day && day.scored > 0 && <NowBlock day={day} lang={lang} />}
      {sec.points.length > 0 ? (
        <PointList points={sec.points} label={sec.kind === "other" ? undefined : t(lang, "whatHappened")} lang={lang} />
      ) : (
        <p className="px-4 pt-3 text-sm text-text-muted sm:px-5">{t(lang, "nothingHere")}</p>
      )}
    </section>
  );
}

/**
 * "Your stocks today" — what happened on everything the reader owns or
 * follows, in sentences, not a price list (the watchlist page is the price
 * list). Split by where the stock lives (2026-10-27, user decision): **Your
 * portfolio** (H) and **Your watchlist** (★; a stock in both sits under the
 * portfolio only), plus "Other updates" for new names on a saved screen.
 * Each section has:
 *
 * 1. The day: how many rose / stayed / fell (sentence + bar), the biggest
 *    riser and faller.
 * 2. Right now: how many carry a Buy (Buy More on a holding) or Sell signal
 *    today, and how many are graded Good or better.
 * 3. What happened: its key points — a price alert hit or close, a Buy More /
 *    Sell flip, new quarterly results, a ±3% move, unusual trading, a 52-week
 *    high or low, a dividend (the cash for a holding), the latest news.
 *
 * It took in "Needs your attention", "News on your stocks" and "New results
 * on your stocks" (2026-10-27, user decisions) — there is no second list
 * about the reader's stocks in the money chapter.
 */
export default function MyStocksToday({
  sections,
  when,
  lang = "en",
}: {
  /** From `buildStocksToday()`. */
  sections: StocksSection[];
  /** "last" before the open / on a closed day — the moves are yesterday's. */
  when: "today" | "last";
  lang?: Lang;
}) {
  if (sections.length === 0) return null;
  const bn = lang === "bn";
  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "yourStocksToday")} />
      {sections.map((sec) => (
        <Section key={sec.kind} sec={sec} when={when} lang={lang} />
      ))}
    </section>
  );
}
