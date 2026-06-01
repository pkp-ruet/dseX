import { type ScoreItem, type DividendsUpcoming } from "@/lib/api";

export interface WatchlistPoint {
  kind: "gainer" | "loser" | "dividend";
  text: string;
}

export interface WatchlistSummary {
  tone: "positive" | "negative" | "neutral";
  /** Average daily % change across watched stocks that have a price today. */
  avgChange: number | null;
  upCount: number;
  total: number;
  points: WatchlistPoint[];
}

/**
 * Build a 3-point daily digest for the user's watchlist from data already
 * loaded on the personalized home (scores/prices + upcoming dividends).
 * Returns null when none of the watched codes resolve to price data yet.
 */
export function analyzeWatchlist(
  codes: string[],
  priceMap: Map<string, ScoreItem>,
  dividends: DividendsUpcoming | null,
): WatchlistSummary | null {
  const items = codes
    .map((c) => priceMap.get(c.toUpperCase()))
    .filter((x): x is ScoreItem => !!x);
  if (items.length === 0) return null;

  const withChg = items.filter(
    (s): s is ScoreItem & { change_pct: number } => s.change_pct != null,
  );
  const total = withChg.length;
  const upCount = withChg.filter((s) => s.change_pct > 0).length;
  const avgChange = total > 0 ? withChg.reduce((a, s) => a + s.change_pct, 0) / total : null;

  const tone: WatchlistSummary["tone"] =
    avgChange == null || Math.abs(avgChange) < 0.05
      ? "neutral"
      : avgChange > 0
        ? "positive"
        : "negative";

  const points: WatchlistPoint[] = [];

  // Best & worst movers
  if (total === 1) {
    const s = withChg[0];
    points.push({
      kind: s.change_pct >= 0 ? "gainer" : "loser",
      text: `${s.trading_code} ${s.change_pct >= 0 ? "+" : ""}${s.change_pct.toFixed(2)}% today`,
    });
  } else if (total > 1) {
    const sorted = [...withChg].sort((a, b) => b.change_pct - a.change_pct);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best.change_pct > 0) {
      points.push({ kind: "gainer", text: `${best.trading_code} leads · +${best.change_pct.toFixed(2)}%` });
    }
    if (worst.change_pct < 0) {
      points.push({ kind: "loser", text: `${worst.trading_code} lags · ${worst.change_pct.toFixed(2)}%` });
    }
  }

  // Upcoming dividends among watched stocks
  const watched = new Set(codes.map((c) => c.toUpperCase()));
  const divCodes = Array.from(
    new Set(
      [
        ...(dividends?.upcoming_declarations ?? []),
        ...(dividends?.upcoming_record_dates ?? []),
      ]
        .map((d) => d.trading_code.toUpperCase())
        .filter((c) => watched.has(c)),
    ),
  );
  if (divCodes.length > 0) {
    const shown = divCodes.slice(0, 3).join(", ");
    const more = divCodes.length > 3 ? ` +${divCodes.length - 3}` : "";
    points.push({
      kind: "dividend",
      text: `${divCodes.length} dividend${divCodes.length > 1 ? "s" : ""} coming · ${shown}${more}`,
    });
  }

  return { tone, avgChange, upCount, total, points };
}
