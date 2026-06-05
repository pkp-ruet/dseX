import type { ScoreItem } from "@/lib/api";
import type { StockListItem, StockListDef } from "@/lib/stock-lists";
import { formatMetric } from "@/lib/stock-lists";
import { getTier, type TierKey } from "@/lib/constants";

// ── Dynamic month/year helpers ───────────────────────────────────────────────

export function getCurrentMonthYear(): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());
}

export function getUpdatedLabel(): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date()
  );
}

export function getCurrentMonthKeywords(): string[] {
  const my = getCurrentMonthYear(); // e.g. "May 2026"
  const [month, year] = my.split(" ");
  return [
    `best stocks to buy ${my}`,
    `best DSE stocks ${month} ${year}`,
    `top shares Bangladesh ${month} ${year}`,
    `DSE picks ${month} ${year}`,
    `best sector ${month} ${year}`,
  ];
}

// ── Plain-language verdict (replaces tier jargon) ────────────────────────────

export interface Verdict {
  label: string;
  colorVar: string;
}

const VERDICTS: Record<TierKey, Verdict> = {
  strong_buy:    { label: "Top-tier pick",     colorVar: "var(--strong-buy)" },
  buy:           { label: "Solid & dependable", colorVar: "var(--safe-buy)" },
  keep_watching: { label: "One to watch",       colorVar: "var(--watch)" },
  avoid:         { label: "Higher risk",        colorVar: "var(--avoid)" },
};

export function getVerdict(score: number | null | undefined): Verdict {
  return VERDICTS[getTier(score)];
}

// ── Unified story entry (what the editorial components render) ────────────────

export interface StoryEntry {
  rank: number;
  title: string;            // company name or sector name
  code?: string;            // trading code — shown as the link label
  href?: string;            // /stock/CODE
  sector?: string | null;
  verdict?: Verdict;
  body: string;             // flowing plain-language prose
  stat?: { label: string; value: string };
  changePct?: number | null;
}

// ── Filter / sort helpers (insight-mode lists) ───────────────────────────────

function compositeMonthScore(item: ScoreItem): number {
  const s = ((item.score ?? 0) / 100) * 0.6;
  const eps = (Math.max(-50, Math.min(100, item.eps_yoy_pct ?? 0)) / 100) * 0.4;
  return s + eps;
}

export function filterInsightItems(items: ScoreItem[], slug: string): ScoreItem[] {
  switch (slug) {
    case "best-dse-stocks-2026":
      return items
        .filter((s) => (s.score ?? 0) >= 55)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 20);

    case "best-bank-stocks-2026":
      return items
        .filter((s) => /bank|nbfi|leasing|finance/i.test(s.sector ?? ""))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 15);

    case "best-stocks-this-month":
      return items
        .filter((s) => s.score != null)
        .sort((a, b) => compositeMonthScore(b) - compositeMonthScore(a))
        .slice(0, 20);

    case "undervalued-stocks-2026":
      return items
        .filter((s) => s.p4_val != null && (s.score ?? 0) >= 35)
        .sort((a, b) => (b.p4_val ?? 0) - (a.p4_val ?? 0))
        .slice(0, 15);

    case "high-growth-stocks-2026":
      return items
        .filter((s) => s.p1_biz != null && (s.score ?? 0) >= 35)
        .sort((a, b) => (b.p1_biz ?? 0) - (a.p1_biz ?? 0))
        .slice(0, 15);

    default:
      return items
        .filter((s) => s.score != null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 20);
  }
}

// ── Plain-language trait clauses (no scores, no pillar jargon) ────────────────

type PillarKey = "p1_biz" | "p2_health" | "p3_moat" | "p4_val" | "p5_div";

function fmtPct(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(0)}%`;
}

/** A short plain clause describing a strength. Lower-case, joinable mid-sentence. */
function traitClause(key: PillarKey, item: ScoreItem): string {
  switch (key) {
    case "p1_biz": {
      const eps = item.eps_yoy_pct;
      if (eps != null && eps >= 5) return `profits have been climbing — earnings rose ${fmtPct(eps)} over the past year`;
      return "profits have grown steadily year after year";
    }
    case "p2_health":
      return "the balance sheet is in good shape, with little debt weighing it down";
    case "p3_moat":
      return "it holds a firm grip on its corner of the market";
    case "p4_val":
      return "and at today's price, the shares look cheap for what you get";
    case "p5_div": {
      const y = item.div_yield_pct;
      if (y != null && y > 0) return `it hands shareholders a dependable ${y.toFixed(1)}% dividend`;
      return "it has a steady record of paying dividends";
    }
  }
}

/** Pick the strongest plain traits for a stock, ordered. */
function strongTraits(item: ScoreItem): PillarKey[] {
  const keys: PillarKey[] = ["p1_biz", "p2_health", "p3_moat", "p4_val", "p5_div"];
  return keys
    .filter((k) => (item[k] ?? 0) >= 6.5)
    .sort((a, b) => (item[b] ?? 0) - (item[a] ?? 0));
}

function joinClauses(clauses: string[]): string {
  if (clauses.length === 0) return "";
  if (clauses.length === 1) return clauses[0];
  if (clauses.length === 2) return `${clauses[0]}, and ${clauses[1]}`;
  return `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nameOf(item: ScoreItem): string {
  return item.company_name?.trim() || item.trading_code;
}

// ── Per-stock prose (rundown — one tight sentence) ────────────────────────────

export function generateStockInsight(item: ScoreItem): string {
  const traits = strongTraits(item);
  const verdict = getVerdict(item.score);

  if (traits.length === 0) {
    return `A balanced name with no single standout, but nothing broken either — ${verdict.label.toLowerCase()} for patient investors.`;
  }

  const lead = traitClause(traits[0], item);
  return `${cap(lead)}.`;
}

// ── Spotlight prose (top picks — a short editorial paragraph) ─────────────────

export function generateSpotlight(item: ScoreItem, rank: number): string {
  const name = nameOf(item);
  const sec = item.sector?.trim();
  const traits = strongTraits(item);
  const verdict = getVerdict(item.score);

  const opener =
    rank === 1
      ? `Topping the list is ${name}`
      : `Next up, ${name}`;
  const secBit = sec ? ` — ${sec.toLowerCase()}` : "";

  let middle: string;
  if (traits.length === 0) {
    middle = "It doesn't dominate any one area, but it holds together well across the board";
  } else {
    const picked = traits.slice(0, 2).map((k) => traitClause(k, item));
    middle = cap(joinClauses(picked));
  }

  // valuation caveat
  const valWeak = (item.p4_val ?? 10) < 4;
  const caveat = valWeak ? " The one catch: the price looks a little rich right now, so timing matters." : "";

  return `${opener}${secBit}. ${middle}. ${caveat} The bottom line: ${verdict.label.toLowerCase()}.`.replace(
    /\s+/g,
    " "
  );
}

// ── Lede (opening editorial paragraph for the whole list) ─────────────────────

const LEDE_TEMPLATES: Record<string, (top: string, n: number) => string> = {
  "best-dse-stocks-2026": (top, n) =>
    `Hunting for the strongest names on the Dhaka Stock Exchange? Start here. We sifted every listed company down to the ${n} that pair steady earnings with healthy books and a fair price — led this year by ${top}. Here's the shortlist, and why each one earned its place.`,
  "best-bank-stocks-2026": (top, n) =>
    `Banks make up the biggest slice of the Dhaka market, but they're far from equal. These ${n} stand out for steady earnings, sound books and reliable payouts — with ${top} leading the pack. Here's how they stack up.`,
  "best-stocks-this-month": (top, n) =>
    `This month's shortlist blends lasting quality with fresh momentum — companies that are both fundamentally solid and showing improving earnings right now. ${top} sits at the top of the ${n}. Here's what's catching our eye.`,
  "undervalued-stocks-2026": (top, n) =>
    `Sometimes a good company simply goes on sale. These ${n} names trade below what their earnings and assets suggest they're worth — bargains hiding in plain sight, with ${top} the pick of the bunch. Here's the case for each.`,
  "high-growth-stocks-2026": (top, n) =>
    `Some businesses just keep getting bigger. These ${n} have the most reliable earnings growth on the exchange — not a one-year fluke, but year-after-year expansion, led by ${top}. Here's the story behind the numbers.`,
};

export function generateLede(slug: string, items: ScoreItem[]): string {
  const top = items[0] ? nameOf(items[0]) : "the leaders";
  const n = items.length;
  const tpl = LEDE_TEMPLATES[slug];
  if (tpl) return tpl(top, n);
  return `A look at ${n} stocks on the Dhaka Stock Exchange worth a closer look, led by ${top}. Here's what makes each one stand out.`;
}

// ── Map insight items → unified StoryEntry list ───────────────────────────────

export function buildInsightEntries(items: ScoreItem[]): StoryEntry[] {
  return items.map((item, i) => {
    const rank = i + 1;
    const isSpotlight = rank <= 3;
    return {
      rank,
      title: nameOf(item),
      code: item.trading_code,
      href: `/stock/${item.trading_code}`,
      sector: item.sector,
      verdict: getVerdict(item.score),
      body: isSpotlight ? generateSpotlight(item, rank) : generateStockInsight(item),
      stat: item.ltp != null ? { label: "Price", value: `৳${item.ltp.toFixed(1)}` } : undefined,
      changePct: item.change_pct,
    };
  });
}

// ── Classic lists (metric tables → plain prose) ───────────────────────────────

function classicClause(item: StockListItem, def: StockListDef): string {
  const v = item.metric_value;
  if (v == null) return "one of the names worth a look in this group";
  const f = formatMetric(v, def.metricFormat);

  switch (def.metricFormat) {
    case "percent":
      if (def.slug.includes("dividend"))
        return `pays a ${f} dividend yield — among the most generous income on the market`;
      if (def.slug.includes("growth"))
        return `grew its earnings ${f} over the year — one of the fastest movers on the exchange`;
      if (def.slug.includes("performing") || def.slug.includes("52"))
        return `has climbed ${f} from its 12-month low — one of the year's strongest runs`;
      return `posts ${f} on this measure — near the top of the field`;
    case "currency":
      if (def.slug.includes("profit"))
        return `booked ${f} in profit last year — real money by Dhaka market standards`;
      return `is worth ${f} in total — one of the genuine heavyweights of the exchange`;
    case "volume":
      return `trades around ${f} shares a day — easy to buy and sell without moving the price`;
    case "number":
    default:
      return `earns ৳${v.toFixed(2)} per share — one of the fattest profits-per-share you'll find`;
  }
}

const CLASSIC_LEDE: Record<string, (top: string, label: string) => string> = {
  percent: (top) => `These are the leaders, ranked from strongest down. ${top} sets the pace.`,
};

export function generateClassicLede(def: StockListDef, items: StockListItem[]): string {
  const top = items[0]?.company_name?.trim() || items[0]?.trading_code || "the leaders";
  switch (def.metricFormat) {
    case "percent":
      if (def.slug.includes("dividend"))
        return `Looking for steady income from the Dhaka Stock Exchange? These companies hand back the most to shareholders, ranked by dividend yield — with ${top} leading the way. Just remember: a fat yield is only as good as the company paying it.`;
      if (def.slug.includes("growth"))
        return `These are the fastest-growing companies on the exchange, ranked by how much their earnings jumped over the past year. ${top} tops the list. Fast growth is exciting — just check it's built to last, not a one-off.`;
      return `The strongest price performers on the Dhaka market over the past year, led by ${top}. Strong runs can keep going — or run out of steam, so look past the chart before you buy.`;
    case "currency":
      if (def.slug.includes("profit"))
        return `These are the real profit engines of the Dhaka Stock Exchange — the companies turning the most actual taka into earnings, led by ${top}. Size isn't everything, but consistent profit is a sign of a business that works.`;
      return `The giants of the Dhaka Stock Exchange, ranked by total market value, with ${top} at the top. Big companies tend to be steadier and easier to trade — the backbone of most portfolios.`;
    case "volume":
      return `The most actively traded names on the exchange, led by ${top}. Heavy trading means you can get in and out easily — handy, but high volume alone doesn't make a stock a good buy.`;
    case "number":
    default:
      return `Ranked by earnings per share — how much profit each company makes for every share you hold. ${top} leads. High earnings power is a great start; pair it with a fair price and you've got something.`;
  }
}

export function buildClassicEntries(items: StockListItem[], def: StockListDef): StoryEntry[] {
  return items.map((item, i) => ({
    rank: i + 1,
    title: item.company_name?.trim() || item.trading_code,
    code: item.trading_code,
    href: `/stock/${item.trading_code}`,
    sector: item.sector,
    body: cap(classicClause(item, def)) + ".",
    stat:
      item.metric_value != null
        ? { label: def.metricLabel, value: formatMetric(item.metric_value, def.metricFormat) }
        : undefined,
  }));
}

// ── Sector aggregation ───────────────────────────────────────────────────────

export interface SectorSummary {
  sector: string;
  avgScore: number;
  topStock: ScoreItem;
  stockCount: number;
  strongBuyCount: number;
  avgEpsYoy: number | null;
  insight: string;
}

export function getSectorInsights(items: ScoreItem[]): SectorSummary[] {
  const bySector = new Map<string, ScoreItem[]>();
  for (const item of items) {
    const sec = item.sector?.trim() || "Other";
    if (!bySector.has(sec)) bySector.set(sec, []);
    bySector.get(sec)!.push(item);
  }

  const summaries: SectorSummary[] = [];

  for (const [sector, stocks] of bySector) {
    if (stocks.length < 2) continue;
    const scored = stocks.filter((s) => s.score != null);
    if (scored.length === 0) continue;

    const avgScore = scored.reduce((acc, s) => acc + (s.score ?? 0), 0) / scored.length;
    const topStock = scored.reduce((a, b) => ((a.score ?? 0) > (b.score ?? 0) ? a : b));
    const strongBuyCount = scored.filter((s) => (s.score ?? 0) >= 75).length;

    const epsVals = stocks
      .filter((s) => s.eps_yoy_pct != null)
      .map((s) => s.eps_yoy_pct as number);
    const avgEpsYoy =
      epsVals.length > 0 ? epsVals.reduce((a, b) => a + b, 0) / epsVals.length : null;

    const topName = nameOf(topStock);
    const strongBit =
      strongBuyCount > 0
        ? ` ${strongBuyCount} of its names rank among the market's best.`
        : "";
    const epsBit =
      avgEpsYoy != null && avgEpsYoy > 3
        ? ` Earnings across the sector are growing, up ${fmtPct(avgEpsYoy)} on average.`
        : avgEpsYoy != null && avgEpsYoy < -3
        ? ` Earnings here have softened lately, down ${fmtPct(Math.abs(avgEpsYoy))} on average.`
        : "";
    const insight = `A deep field of ${scored.length} companies, with ${topName} the standout.${strongBit}${epsBit}`;

    summaries.push({ sector, avgScore, topStock, stockCount: stocks.length, strongBuyCount, avgEpsYoy, insight });
  }

  return summaries.sort((a, b) => b.avgScore - a.avgScore).slice(0, 12);
}

export function buildSectorEntries(sectors: SectorSummary[]): StoryEntry[] {
  return sectors.map((s, i) => ({
    rank: i + 1,
    title: s.sector,
    sector: null,
    verdict: getVerdict(s.avgScore),
    body: s.insight,
    code: s.topStock.trading_code,
    href: `/stock/${s.topStock.trading_code}`,
    stat: { label: "Top stock", value: s.topStock.trading_code },
  }));
}

export function generateSectorLede(sectors: SectorSummary[]): string {
  const top = sectors[0]?.sector ?? "the leaders";
  return `Some corners of the Dhaka Stock Exchange are simply healthier than others. Ranked by the overall strength of the companies inside them, ${top} leads the field this month. Here's where the fundamentals are strongest — and where to start your search.`;
}

// ── Pillar display metadata (still used by portfolio holdings detail) ─────────

export const PILLAR_META: { key: PillarKey; label: string; short: string }[] = [
  { key: "p1_biz",    label: "Business Quality", short: "P1" },
  { key: "p2_health", label: "Financial Health",  short: "P2" },
  { key: "p3_moat",   label: "Competitive Moat",  short: "P3" },
  { key: "p4_val",    label: "Valuation",          short: "P4" },
  { key: "p5_div",    label: "Dividend",           short: "P5" },
];

export function pillarColor(val: number | null | undefined): string {
  if (val == null) return "var(--text-muted)";
  if (val >= 7) return "var(--positive)";
  if (val >= 4) return "var(--watch)";
  return "var(--negative)";
}
