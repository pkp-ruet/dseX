import type { StockListItem, StockListDef } from "@/lib/stock-lists";
import { formatMetric } from "@/lib/stock-lists";

/*
 * Prose for the four free stock lists (`/stock-insights/[slug]`) + the one
 * pillar colour scale. The score-based shortlists, sector watch and monthly
 * lists that used to live here were removed with those lists (2026-10-24).
 */

export function getUpdatedLabel(): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date()
  );
}

// ── Story entry (what the editorial components render) ────────────────────────

export interface Verdict {
  label: string;
  colorVar: string;
}

export interface StoryEntry {
  rank: number;
  title: string;            // company name
  code?: string;            // trading code — shown as the link label
  href?: string;            // /stock/CODE
  sector?: string | null;
  verdict?: Verdict;
  body: string;             // flowing plain-language prose
  stat?: { label: string; value: string };
  changePct?: number | null;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Free lists (one number → plain prose) ─────────────────────────────────────

function clause(item: StockListItem, def: StockListDef): string {
  const v = item.metric_value;
  if (v == null) return "one of the names worth a look in this group";
  const f = formatMetric(v, def.metricFormat);
  switch (def.apiKey) {
    case "top_dividend":
      return `pays a ${f} dividend yield — among the most generous income on the market`;
    case "top_52w_return":
      return `is up ${f} on a year ago — one of the year's strongest runs`;
    case "top_volume":
      return `saw ${f} change hands on the last trading day — easy to buy and sell without moving the price`;
    case "top_market_cap":
    default:
      return `is worth ${f} in total — one of the genuine heavyweights of the exchange`;
  }
}

export function generateClassicLede(def: StockListDef, items: StockListItem[]): string {
  const top = items[0]?.company_name?.trim() || items[0]?.trading_code || "the leaders";
  switch (def.apiKey) {
    case "top_dividend":
      return `Looking for steady income from the Dhaka Stock Exchange? These companies hand back the most to shareholders, ranked by dividend yield — with ${top} leading the way. Just remember: a fat yield is only as good as the company paying it.`;
    case "top_52w_return":
      return `The strongest price performers on the Dhaka market over the past year, led by ${top}. Strong runs can keep going — or run out of steam, so look past the chart before you buy.`;
    case "top_volume":
      return `The most actively traded names on the exchange by money changing hands, led by ${top}. Heavy trading means you can get in and out easily — handy, but busy trading alone doesn't make a stock a good buy.`;
    case "top_market_cap":
    default:
      return `The giants of the Dhaka Stock Exchange, ranked by total market value, with ${top} at the top. Big companies tend to be steadier and easier to trade — the backbone of most portfolios.`;
  }
}

export function buildClassicEntries(items: StockListItem[], def: StockListDef): StoryEntry[] {
  return items.map((item, i) => ({
    rank: i + 1,
    title: item.company_name?.trim() || item.trading_code,
    code: item.trading_code,
    href: `/stock/${item.trading_code}`,
    sector: item.sector,
    body: cap(clause(item, def)) + ".",
    stat:
      item.metric_value != null
        ? { label: def.metricLabel, value: formatMetric(item.metric_value, def.metricFormat) }
        : undefined,
  }));
}

// ── Pillar colour ─────────────────────────────────────────────────────────────

/**
 * Colour for a 0–10 pillar / sub-metric bar. Three bands, expressed with the
 * tier tokens so a bar means the same thing as a tier pill beside it:
 * ≥7 excellent · ≥4 average · below weak. Null (never scraped) is muted.
 * THE pillar colour scale — every pillar bar in the app reads it.
 */
export function pillarColor(val: number | null | undefined): string {
  if (val == null) return "var(--text-muted)";
  if (val >= 7) return "var(--tier-excellent)";
  if (val >= 4) return "var(--tier-average)";
  return "var(--tier-weak)";
}
