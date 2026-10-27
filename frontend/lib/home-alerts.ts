import type {
  ScoreItem,
  NearExtremesData,
  DividendsUpcoming,
  WatchlistNewsItem,
  PriceAlert,
  PortfolioSignalEvent,
  PortfolioHolding,
  CorporateActionEvent,
  ScreenerSaved,
} from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { bdGroup, formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { recordDateInfo } from "@/lib/dividend-dates";

export type HomeAlertTone = "positive" | "negative" | "neutral";

export type HomeAlertKind =
  | "target"
  | "signal"
  | "portfolio"
  | "mover"
  | "high"
  | "low"
  | "dividend"
  | "news"
  | "screen"
  /** Built by the dashboard's MyStocksToday, not here: */
  | "results"
  | "volume";

export interface HomeAlert {
  /** Stable per-day id — also the key for read/seen state. */
  id: string;
  /** What the alert is about — the dashboard maps this to an SVG icon. */
  kind: HomeAlertKind;
  /** Legacy glyph (assistant brief + retired AlertsBell still read it). */
  emoji: string;
  /** The stock it is about (absent for portfolio-wide / screen rows). */
  code?: string;
  title: string;
  detail?: string;
  href?: string;
  tone: HomeAlertTone;
}

const MOVER_THRESHOLD = 3; // only surface moves of at least ±3%
const NEAR_TARGET_PCT = 3; // an armed price alert within 3% of the price
const MAX_MOVERS = 3;
const MAX_NEWS = 3;
const TRIGGER_RECENCY_MS = 2 * 24 * 60 * 60 * 1000; // surface a hit target for ~2 days
const SIGNAL_RECENCY_MS = 3 * 24 * 60 * 60 * 1000; // surface a signal flip for ~3 days

function fmtPrice(n: number): string {
  return Number(n.toFixed(2)).toString();
}

/** "Now ৳412 · yearly high ৳420" — the 52-week rows' detail line. */
function rangeDetail(ltp: number | null, mark: number | null, side: "high" | "low", bn: boolean): string | undefined {
  if (ltp == null || mark == null) return undefined;
  if (bn) return `এখন ৳${fmtPrice(ltp)} · বছরের ${side === "high" ? "সর্বোচ্চ" : "সর্বনিম্ন"} ৳${fmtPrice(mark)}`;
  return `Now ৳${fmtPrice(ltp)} · yearly ${side} ৳${fmtPrice(mark)}`;
}

/**
 * Builds the personalized "what's new" list from data already loaded on the
 * home page — targets hit or close, Buy More / Sell flips on holdings, portfolio move,
 * big movers, 52-week extremes, upcoming dividends, and (optionally) latest
 * news. Ordered by importance.
 *
 * The universe is **holdings ∪ watchlist**. Until 2026-09-16 it was the
 * watchlist only, so a portfolio-only user never saw a mover, a 52-week low or
 * a record date on the stocks they actually own.
 *
 * `includeNews` is opt-out (default true): the home dashboard sets it false so
 * its own `keyPoints()` adds news with dedupe against results / dividends,
 * while the assistant's single "what's new" brief keeps news inline.
 *
 * `lang` writes every sentence in English or everyday Bengali (Western digits).
 */
export function buildHomeAlerts(opts: {
  /** Watchlist codes. */
  codes: string[];
  /** Portfolio holdings — adds their codes to the universe and lets the
   *  dividend rows say what the reader will actually be paid. */
  holdings?: PortfolioHolding[];
  priceMap: Map<string, ScoreItem>;
  todayMove: { delta: number; pct: number } | null;
  extremes: NearExtremesData | null;
  dividends: DividendsUpcoming | null;
  /** Calendar record-date rows (cash per share worked out) for the user's codes. */
  dividendCash?: CorporateActionEvent[];
  news?: WatchlistNewsItem[];
  triggeredAlerts?: PriceAlert[];
  signalEvents?: PortfolioSignalEvent[];
  /** Saved screens (Premium readers only — a lapsed plan's screens aren't
   *  re-checked): one row per screen a stock joined at the last daily check. */
  savedScreens?: ScreenerSaved[];
  dateKey: string;
  /** Include latest news as 📰 rows. Default true. */
  includeNews?: boolean;
  lang?: Lang;
}): HomeAlert[] {
  const {
    codes,
    holdings = [],
    priceMap,
    todayMove,
    extremes,
    dividends,
    dividendCash = [],
    news = [],
    triggeredAlerts,
    signalEvents,
    savedScreens = [],
    dateKey,
    includeNews = true,
  } = opts;
  const bn = opts.lang === "bn";

  const held = new Map<string, PortfolioHolding>();
  for (const h of holdings) held.set(h.trading_code.toUpperCase(), h);
  const universe = new Set<string>([...held.keys(), ...codes.map((c) => c.toUpperCase())]);
  const alerts: HomeAlert[] = [];

  // 0 — Price targets hit (most personal — lead with these). The server is the
  // source of truth: an alert with a recent `triggered_at` fired today/yesterday.
  const now = Date.now();
  for (const a of triggeredAlerts ?? []) {
    if (!a.triggered_at) continue;
    const t = Date.parse(a.triggered_at);
    if (Number.isNaN(t) || now - t > TRIGGER_RECENCY_MS) continue;
    const target = fmtPrice(a.target_price);
    const reached = a.triggered_price != null ? fmtPrice(a.triggered_price) : null;
    alerts.push({
      id: `pa:${a.id}`,
      kind: "target",
      code: a.trading_code,
      emoji: "🎯",
      title: bn ? `${a.trading_code} আপনার ৳${target} লক্ষ্যে পৌঁছেছে` : `${a.trading_code} hit your ৳${target} target`,
      detail: reached ? (bn ? `৳${reached}-এ পৌঁছেছে` : `Reached ৳${reached}`) : undefined,
      href: `/stock/${a.trading_code}`,
      tone: a.direction === "above" ? "positive" : "negative",
    });
  }

  // 0.1 — Armed price alerts the price has come close to (not hit yet).
  for (const a of triggeredAlerts ?? []) {
    if (!a.is_active || a.triggered_at || !(a.target_price > 0)) continue;
    const code = a.trading_code.toUpperCase();
    const ltp = priceMap.get(code)?.ltp;
    if (ltp == null || ltp <= 0) continue;
    const gap = a.direction === "above" ? (a.target_price - ltp) / a.target_price : (ltp - a.target_price) / a.target_price;
    if (gap <= 0 || gap * 100 > NEAR_TARGET_PCT) continue;
    const target = fmtPrice(a.target_price);
    const gapStr = (gap * 100).toFixed(1);
    alerts.push({
      id: `pn:${a.id}:${dateKey}`,
      kind: "target",
      code: a.trading_code,
      emoji: "🎯",
      title: bn
        ? `${a.trading_code} আপনার ৳${target} অ্যালার্ট থেকে ${gapStr}% দূরে`
        : `${a.trading_code} is ${gapStr}% from your ৳${target} alert`,
      detail: bn ? `এখন ৳${fmtPrice(ltp)}` : `Now ৳${fmtPrice(ltp)}`,
      href: `/stock/${a.trading_code}`,
      tone: "neutral",
    });
  }

  // 0.25 — New stocks on the reader's saved screens (same news as the push).
  for (const s of savedScreens) {
    if (!s.new_today.length) continue;
    const n = s.new_today.length;
    const codes3 = s.new_today.slice(0, 3).map((x) => x.code).join(", ") + (n > 3 ? "…" : "");
    alerts.push({
      id: `sc:${s.id}:${s.checked_on ?? dateKey}`,
      kind: "screen",
      emoji: "🔎",
      title: bn ? `"${s.name}" স্ক্রিনে নতুন ${n}টি শেয়ার` : `${n} new on your screen "${s.name}"`,
      detail: codes3,
      href: `/screener?tab=saved&list=${encodeURIComponent(s.id)}`,
      tone: "neutral",
    });
  }

  // 0.5 — Portfolio signal flips (server-detected, end-of-day). Both Buy More
  // and Sell are surfaced: for an owner the Sell flip is the one alert that
  // matters most. The reason comes from the holding's own signal when present.
  for (const ev of signalEvents ?? []) {
    if (!ev.changed_at || ev.signal === "none") continue;
    const t = Date.parse(ev.changed_at);
    if (Number.isNaN(t) || now - t > SIGNAL_RECENCY_MS) continue;
    const code = ev.trading_code.toUpperCase();
    const sig = held.get(code)?.signal ?? null;
    const reason = sig && sig.signal === ev.signal ? (bn ? sig.reason_bn : sig.reason_en) || null : null;
    const sell = ev.signal === "sell";
    alerts.push({
      id: `sg:${ev.trading_code}:${ev.changed_at}`,
      kind: "signal",
      code: ev.trading_code,
      emoji: sell ? "🔴" : "🟢",
      title: sell
        ? bn
          ? `${ev.trading_code} এখন বিক্রির মতো দেখাচ্ছে`
          : `${ev.trading_code} now looks like a Sell`
        : bn
          ? `${ev.trading_code} এখন আরও কেনার মতো দেখাচ্ছে`
          : `${ev.trading_code} now looks like a Buy More`,
      detail:
        reason ??
        (sell
          ? bn
            ? "আবার ভেবে দেখার সময়"
            : "Time to take another look"
          : bn
            ? "ভালো কোম্পানি, দাম এখন কম"
            : "Strong company at a cheap price"),
      href: `/stock/${ev.trading_code}`,
      tone: sell ? "negative" : "positive",
    });
  }

  // 1 — Portfolio move today
  if (todayMove && Math.abs(todayMove.delta) >= 1) {
    const up = todayMove.delta >= 0;
    const amt = bdGroup(Math.abs(todayMove.delta));
    alerts.push({
      id: `pf:${dateKey}`,
      kind: "portfolio",
      emoji: up ? "📈" : "📉",
      title: bn ? `পোর্টফোলিও আজ ৳${amt} ${up ? "বেড়েছে" : "কমেছে"}` : `Portfolio ${up ? "up" : "down"} ৳${amt} today`,
      detail: `${up ? "+" : ""}${todayMove.pct.toFixed(2)}%`,
      href: "/portfolio",
      tone: up ? "positive" : "negative",
    });
  }

  // 2 — Biggest movers across everything followed (beyond threshold)
  const movers = Array.from(universe)
    .map((c) => priceMap.get(c))
    .filter(
      (s): s is ScoreItem =>
        !!s && s.change_pct != null && Math.abs(s.change_pct) >= MOVER_THRESHOLD,
    )
    .sort((a, b) => Math.abs(b.change_pct!) - Math.abs(a.change_pct!))
    .slice(0, MAX_MOVERS);
  for (const m of movers) {
    const up = (m.change_pct ?? 0) >= 0;
    const pctStr = `${up ? "+" : ""}${m.change_pct!.toFixed(1)}%`;
    alerts.push({
      id: `mv:${m.trading_code}:${dateKey}`,
      kind: "mover",
      code: m.trading_code,
      emoji: up ? "🟢" : "🔴",
      title: bn ? `${m.trading_code} আজ ${pctStr}` : `${m.trading_code} ${pctStr} today`,
      detail: m.company_name ?? undefined,
      href: `/stock/${m.trading_code}`,
      tone: up ? "positive" : "negative",
    });
  }

  // 3 — Followed stocks near a 52-week high / low
  const extremeSeen = new Set<string>();
  for (const e of extremes?.near_high ?? []) {
    const code = e.trading_code.toUpperCase();
    if (!universe.has(code) || extremeSeen.has(code)) continue;
    extremeSeen.add(code);
    alerts.push({
      id: `hi:${code}:${dateKey}`,
      kind: "high",
      code: e.trading_code,
      emoji: "🔼",
      title: bn ? `${e.trading_code} বছরের সর্বোচ্চ দামের কাছে` : `${e.trading_code} near its 52-week high`,
      detail: rangeDetail(e.ltp, e.w52_high, "high", bn),
      href: `/stock/${e.trading_code}`,
      tone: "positive",
    });
  }
  for (const e of extremes?.near_low ?? []) {
    const code = e.trading_code.toUpperCase();
    if (!universe.has(code) || extremeSeen.has(code)) continue;
    extremeSeen.add(code);
    alerts.push({
      id: `lo:${code}:${dateKey}`,
      kind: "low",
      code: e.trading_code,
      emoji: "🔽",
      title: bn ? `${e.trading_code} বছরের সর্বনিম্ন দামের কাছে` : `${e.trading_code} near its 52-week low`,
      detail: rangeDetail(e.ltp, e.w52_low, "low", bn),
      href: `/stock/${e.trading_code}`,
      tone: "negative",
    });
  }

  // 4 — Dividends on followed stocks. For a stock the reader OWNS and where the
  // calendar knows the cash per share, say what they will be paid and when to
  // hold by; otherwise the plain declaration / record-date notice.
  const divSeen = new Set<string>();
  const cashByCode = new Map<string, CorporateActionEvent>();
  for (const e of dividendCash) {
    const code = e.trading_code.toUpperCase();
    if (!cashByCode.has(code)) cashByCode.set(code, e);
  }
  for (const [code, e] of cashByCode) {
    const h = held.get(code);
    if (!h || !e.record_date) continue;
    const cps = e.cash_per_share;
    const info = recordDateInfo(e.record_date);
    const daysLeft = info?.recordDaysLeft ?? e.record_days_left;
    const when = bn ? bnDate(e.record_date) : formatDate(e.record_date);
    const daysStr =
      daysLeft == null ? "" : bn ? ` · ${daysLeft} দিন বাকি` : ` · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`;
    if (cps != null && cps > 0) {
      const payout = Math.round(h.qty * cps);
      divSeen.add(code);
      alerts.push({
        id: `dv:${code}`,
        kind: "dividend",
        code: e.trading_code,
        emoji: "💰",
        title: bn ? `${e.trading_code} আপনাকে ৳${bdGroup(payout)} দেবে` : `${e.trading_code} pays you ৳${bdGroup(payout)}`,
        detail: bn ? `রেকর্ড ডেট ${when}${daysStr}` : `Record date ${when}${daysStr}`,
        href: `/stock/${e.trading_code}`,
        tone: "positive",
      });
    } else if (e.stock_pct != null && e.stock_pct > 0) {
      divSeen.add(code);
      alerts.push({
        id: `dv:${code}`,
        kind: "dividend",
        code: e.trading_code,
        emoji: "💰",
        title: bn ? `${e.trading_code} ${e.stock_pct}% বোনাস শেয়ার দিচ্ছে` : `${e.trading_code} gives ${e.stock_pct}% bonus shares`,
        detail: bn ? `রেকর্ড ডেট ${when}${daysStr}` : `Record date ${when}${daysStr}`,
        href: `/stock/${e.trading_code}`,
        tone: "neutral",
      });
    }
  }
  for (const d of dividends?.upcoming_declarations ?? []) {
    const code = d.trading_code.toUpperCase();
    if (!universe.has(code) || divSeen.has(code)) continue;
    divSeen.add(code);
    const pct = d.dividend_pct != null ? `${d.dividend_pct}% ` : "";
    alerts.push({
      id: `dv:${code}`,
      kind: "dividend",
      code: d.trading_code,
      emoji: "💰",
      title: bn ? `${d.trading_code} — ${pct}ডিভিডেন্ড ঘোষণা` : `${d.trading_code} — ${pct}dividend declared`,
      href: `/stock/${d.trading_code}`,
      tone: "neutral",
    });
  }
  for (const d of dividends?.upcoming_record_dates ?? []) {
    const code = d.trading_code.toUpperCase();
    if (!universe.has(code) || divSeen.has(code)) continue;
    divSeen.add(code);
    const info = recordDateInfo(d.record_date);
    const detail =
      info && d.record_date
        ? bn
          ? `রেকর্ড ডেট ${bnDate(d.record_date)} · ${info.recordDaysLeft} দিন বাকি`
          : `Record date ${formatDate(d.record_date)} · ${info.recordDaysLeft} ${info.recordDaysLeft === 1 ? "day" : "days"} left`
        : undefined;
    alerts.push({
      id: `dv:${code}`,
      kind: "dividend",
      code: d.trading_code,
      emoji: "💰",
      title: bn ? `${d.trading_code} — ডিভিডেন্ডের রেকর্ড ডেট আসছে` : `${d.trading_code} — dividend record date soon`,
      detail,
      href: `/stock/${d.trading_code}`,
      tone: "neutral",
    });
  }

  // 5 — Latest news (opt-out; the home dashboard shows these in the dedicated
  // "Your stocks today" card builds its own news rows, so it passes includeNews: false).
  if (includeNews) {
    const wlNews = news
      .filter((n) => universe.has(n.trading_code.toUpperCase()))
      .slice(0, MAX_NEWS);
    for (const n of wlNews) {
      alerts.push({
        id: `nw:${n.trading_code}:${n.post_date}:${n.title.slice(0, 48)}`,
        kind: "news",
        code: n.trading_code,
        emoji: "📰",
        title: n.title,
        detail: n.trading_code,
        href: `/stock/${n.trading_code}`,
        tone: "neutral",
      });
    }
  }

  return alerts;
}
