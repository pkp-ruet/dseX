import type {
  ScoreItem,
  NearExtremesData,
  DividendsUpcoming,
  PortfolioHolding,
  MarketIndexData,
} from "@/lib/api";
import { bdGroup } from "@/lib/formatters";

/** One coloured run of the Daily Brief sentence. */
export interface BriefSegment {
  text: string;
  tone?: "pos" | "neg" | "accent";
}

function relDays(date: Date): string {
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 14) return `in ${days} days`;
  return `on ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

interface DivPick {
  code: string;
  date: Date | null;
  kind: "record" | "declaration";
}

function nextDividend(dividends: DividendsUpcoming | null, universe: Set<string>): DivPick | null {
  if (!dividends) return null;
  const picks: DivPick[] = [];
  const parse = (raw: string | null | undefined): Date | null => {
    if (!raw) return null;
    const t = new Date(raw);
    return Number.isNaN(t.getTime()) ? null : t;
  };
  for (const d of dividends.upcoming_record_dates ?? []) {
    if (universe.has(d.trading_code.toUpperCase())) {
      picks.push({ code: d.trading_code, date: parse(d.record_date), kind: "record" });
    }
  }
  for (const d of dividends.upcoming_declarations ?? []) {
    if (universe.has(d.trading_code.toUpperCase())) {
      picks.push({ code: d.trading_code, date: parse(d.projected_date), kind: "declaration" });
    }
  }
  if (picks.length === 0) return null;
  picks.sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
  return picks[0];
}

/**
 * Compose a one-line "daily brief" — the concierge sentence at the top of the
 * dashboard — from data already loaded on the home page. Two short clauses:
 *   1. a lead read (portfolio money → watchlist breadth → whole-market mood), and
 *   2. one highlight (biggest mover → 52-week extreme → nearest dividend).
 * Returns coloured segments so the renderer can emphasise the money/ticker.
 */
export function buildDailyBrief(opts: {
  holdings: PortfolioHolding[];
  codes: string[];
  priceMap: Map<string, ScoreItem>;
  todayMove: { delta: number; pct: number } | null;
  extremes: NearExtremesData | null;
  dividends: DividendsUpcoming | null;
  marketIndex: MarketIndexData | null;
}): BriefSegment[] {
  const { holdings, codes, priceMap, todayMove, extremes, dividends, marketIndex } = opts;
  const held = new Set(holdings.map((h) => h.trading_code.toUpperCase()));
  const universe = new Set([...held, ...codes.map((c) => c.toUpperCase())]);
  const seg: BriefSegment[] = [];

  // ── 1. Lead read ──────────────────────────────────────────────────────────
  if (todayMove && held.size > 0 && Math.abs(todayMove.delta) >= 1) {
    const up = todayMove.delta >= 0;
    seg.push(
      { text: "Your holdings are " },
      { text: `${up ? "up" : "down"} ৳${bdGroup(Math.abs(todayMove.delta))}`, tone: up ? "pos" : "neg" },
      { text: " today." },
    );
  } else {
    const withChg = Array.from(universe)
      .map((c) => priceMap.get(c))
      .filter((s): s is ScoreItem => !!s && s.change_pct != null);
    if (withChg.length > 0) {
      const up = withChg.filter((s) => (s.change_pct as number) > 0).length;
      const total = withChg.length;
      const ratio = up / total;
      if (ratio >= 0.6) {
        seg.push({ text: `${up} of your ${total} stocks are ` }, { text: "up", tone: "pos" }, { text: " today." });
      } else if (ratio <= 0.4) {
        seg.push(
          { text: `Only ${up} of your ${total} stocks are ` },
          { text: "up", tone: up === 0 ? "neg" : undefined },
          { text: " today." },
        );
      } else {
        seg.push({ text: `Your ${total} stocks are mixed today.` });
      }
    } else {
      const u = marketIndex?.up_count ?? null;
      const d = marketIndex?.down_count ?? null;
      if (u != null && d != null && u + d > 0) {
        const r = u / (u + d);
        if (r >= 0.58) seg.push({ text: "Buyers are " }, { text: "in control", tone: "pos" }, { text: " across the market today." });
        else if (r <= 0.42) seg.push({ text: "Sellers are " }, { text: "in control", tone: "neg" }, { text: " across the market today." });
        else seg.push({ text: "The market is evenly split today." });
      } else {
        seg.push({ text: "Here's your market at a glance." });
      }
    }
  }

  // ── 2. One highlight ──────────────────────────────────────────────────────
  const movers = Array.from(universe)
    .map((c) => priceMap.get(c))
    .filter((s): s is ScoreItem => !!s && s.change_pct != null && Math.abs(s.change_pct as number) >= 3)
    .sort((a, b) => Math.abs(b.change_pct as number) - Math.abs(a.change_pct as number));

  if (movers.length > 0) {
    const m = movers[0];
    const up = (m.change_pct as number) >= 0;
    seg.push({ text: " " }, { text: m.trading_code, tone: "accent" });
    if (up) {
      seg.push({ text: " is leading, " }, { text: `+${(m.change_pct as number).toFixed(1)}%`, tone: "pos" }, { text: "." });
    } else {
      seg.push({ text: " is down " }, { text: `${Math.abs(m.change_pct as number).toFixed(1)}%`, tone: "neg" }, { text: "." });
    }
    return seg;
  }

  const nearHigh = (extremes?.near_high ?? []).find((e) => universe.has(e.trading_code.toUpperCase()));
  const nearLow = (extremes?.near_low ?? []).find((e) => universe.has(e.trading_code.toUpperCase()));
  if (nearHigh) {
    seg.push({ text: " " }, { text: nearHigh.trading_code, tone: "accent" }, { text: " is near a " }, { text: "52-week high", tone: "pos" }, { text: "." });
    return seg;
  }
  if (nearLow) {
    seg.push({ text: " " }, { text: nearLow.trading_code, tone: "accent" }, { text: " is near a " }, { text: "52-week low", tone: "neg" }, { text: "." });
    return seg;
  }

  const div = nextDividend(dividends, universe);
  if (div) {
    seg.push({ text: " " }, { text: div.code, tone: "accent" });
    seg.push({
      text: div.date
        ? ` ${div.kind === "record" ? "records its dividend" : "is expected to declare a dividend"} ${relDays(div.date)}.`
        : " has a dividend coming up.",
    });
  }

  return seg;
}
