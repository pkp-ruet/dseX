import type {
  ScoreItem,
  NearExtremesData,
  DividendsUpcoming,
  WatchlistNewsItem,
  PriceAlert,
  PortfolioSignalEvent,
} from "@/lib/api";

export type HomeAlertTone = "positive" | "negative" | "neutral";

export interface HomeAlert {
  /** Stable per-day id — also the key for read/seen state. */
  id: string;
  emoji: string;
  title: string;
  detail?: string;
  href?: string;
  tone: HomeAlertTone;
}

const MOVER_THRESHOLD = 3; // only surface watchlist moves of at least ±3%
const MAX_MOVERS = 3;
const MAX_NEWS = 3;
const TRIGGER_RECENCY_MS = 2 * 24 * 60 * 60 * 1000; // surface a hit target for ~2 days
const SIGNAL_RECENCY_MS = 3 * 24 * 60 * 60 * 1000; // surface a signal flip for ~3 days

function fmtPrice(n: number): string {
  return Number(n.toFixed(2)).toString();
}

/**
 * Builds the personalized "what's new" list for the header bell from data
 * already loaded on the home page — portfolio move, big watchlist movers,
 * 52-week extremes, upcoming dividends, and latest watchlist news. Ordered by
 * importance (portfolio → movers → extremes → dividends → news).
 */
export function buildHomeAlerts(opts: {
  codes: string[];
  priceMap: Map<string, ScoreItem>;
  todayMove: { delta: number; pct: number } | null;
  extremes: NearExtremesData | null;
  dividends: DividendsUpcoming | null;
  news: WatchlistNewsItem[];
  triggeredAlerts?: PriceAlert[];
  signalEvents?: PortfolioSignalEvent[];
  dateKey: string;
}): HomeAlert[] {
  const { codes, priceMap, todayMove, extremes, dividends, news, triggeredAlerts, signalEvents, dateKey } = opts;
  const watch = new Set(codes.map((c) => c.toUpperCase()));
  const alerts: HomeAlert[] = [];

  // 0 — Price targets hit (most personal — lead with these). The server is the
  // source of truth: an alert with a recent `triggered_at` fired today/yesterday.
  const now = Date.now();
  for (const a of triggeredAlerts ?? []) {
    if (!a.triggered_at) continue;
    const t = Date.parse(a.triggered_at);
    if (Number.isNaN(t) || now - t > TRIGGER_RECENCY_MS) continue;
    alerts.push({
      id: `pa:${a.id}`,
      emoji: "🎯",
      title: `${a.trading_code} hit your ৳${fmtPrice(a.target_price)} target`,
      detail: a.triggered_price != null ? `Reached ৳${fmtPrice(a.triggered_price)}` : undefined,
      href: `/stock/${a.trading_code}`,
      tone: a.direction === "above" ? "positive" : "negative",
    });
  }

  // 0.5 — Portfolio signal flips (server-detected, end-of-day). Sell flips are
  // the actionable ones; Buy More flips are a friendly nudge.
  for (const ev of signalEvents ?? []) {
    if (!ev.changed_at || ev.signal === "hold") continue;
    const t = Date.parse(ev.changed_at);
    if (Number.isNaN(t) || now - t > SIGNAL_RECENCY_MS) continue;
    const sell = ev.signal === "sell";
    alerts.push({
      id: `sg:${ev.trading_code}:${ev.changed_at}`,
      emoji: sell ? "⚠️" : "🟢",
      title: sell
        ? `${ev.trading_code} signal changed to Sell`
        : `${ev.trading_code} now looks like a Buy More`,
      detail: sell ? "Time to review this holding" : "Strong company at a cheap price",
      href: "/portfolio",
      tone: sell ? "negative" : "positive",
    });
  }

  // 1 — Portfolio move today
  if (todayMove && Math.abs(todayMove.delta) >= 1) {
    const up = todayMove.delta >= 0;
    alerts.push({
      id: `pf:${dateKey}`,
      emoji: up ? "📈" : "📉",
      title: `Portfolio ${up ? "up" : "down"} ৳${Math.abs(todayMove.delta).toLocaleString("en-US", { maximumFractionDigits: 0 })} today`,
      detail: `${up ? "+" : ""}${todayMove.pct.toFixed(2)}%`,
      href: "/portfolio",
      tone: up ? "positive" : "negative",
    });
  }

  // 2 — Biggest watchlist movers (beyond threshold)
  const movers = codes
    .map((c) => priceMap.get(c.toUpperCase()))
    .filter(
      (s): s is ScoreItem =>
        !!s && s.change_pct != null && Math.abs(s.change_pct) >= MOVER_THRESHOLD,
    )
    .sort((a, b) => Math.abs(b.change_pct!) - Math.abs(a.change_pct!))
    .slice(0, MAX_MOVERS);
  for (const m of movers) {
    const up = (m.change_pct ?? 0) >= 0;
    alerts.push({
      id: `mv:${m.trading_code}:${dateKey}`,
      emoji: up ? "🟢" : "🔴",
      title: `${m.trading_code} ${up ? "+" : ""}${m.change_pct!.toFixed(1)}% today`,
      detail: m.company_name ?? undefined,
      href: `/stock/${m.trading_code}`,
      tone: up ? "positive" : "negative",
    });
  }

  // 3 — Watchlist stocks near a 52-week high / low
  const extremeSeen = new Set<string>();
  for (const e of extremes?.near_high ?? []) {
    const code = e.trading_code.toUpperCase();
    if (!watch.has(code) || extremeSeen.has(code)) continue;
    extremeSeen.add(code);
    alerts.push({
      id: `hi:${code}:${dateKey}`,
      emoji: "🔼",
      title: `${e.trading_code} near its 52-week high`,
      href: `/stock/${e.trading_code}`,
      tone: "positive",
    });
  }
  for (const e of extremes?.near_low ?? []) {
    const code = e.trading_code.toUpperCase();
    if (!watch.has(code) || extremeSeen.has(code)) continue;
    extremeSeen.add(code);
    alerts.push({
      id: `lo:${code}:${dateKey}`,
      emoji: "🔽",
      title: `${e.trading_code} near its 52-week low`,
      href: `/stock/${e.trading_code}`,
      tone: "negative",
    });
  }

  // 4 — Dividends for watchlist stocks (declaration takes priority over record date)
  const divSeen = new Set<string>();
  for (const d of dividends?.upcoming_declarations ?? []) {
    const code = d.trading_code.toUpperCase();
    if (!watch.has(code) || divSeen.has(code)) continue;
    divSeen.add(code);
    const pct = d.dividend_pct != null ? `${d.dividend_pct}% ` : "";
    alerts.push({
      id: `dv:${code}`,
      emoji: "💰",
      title: `${d.trading_code} — ${pct}dividend declared`,
      href: `/stock/${d.trading_code}`,
      tone: "neutral",
    });
  }
  for (const d of dividends?.upcoming_record_dates ?? []) {
    const code = d.trading_code.toUpperCase();
    if (!watch.has(code) || divSeen.has(code)) continue;
    divSeen.add(code);
    alerts.push({
      id: `dv:${code}`,
      emoji: "💰",
      title: `${d.trading_code} — dividend record date soon`,
      href: `/stock/${d.trading_code}`,
      tone: "neutral",
    });
  }

  // 5 — Latest watchlist news
  const wlNews = news
    .filter((n) => watch.has(n.trading_code.toUpperCase()))
    .slice(0, MAX_NEWS);
  for (const n of wlNews) {
    alerts.push({
      id: `nw:${n.trading_code}:${n.post_date}:${n.title.slice(0, 48)}`,
      emoji: "📰",
      title: n.title,
      detail: n.trading_code,
      href: `/stock/${n.trading_code}`,
      tone: "neutral",
    });
  }

  return alerts;
}
