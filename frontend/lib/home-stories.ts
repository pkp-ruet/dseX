import { type ScoreItem } from "@/lib/api";

/**
 * "Three stocks worth knowing" — the marketing-homepage story cards.
 *
 * Each card answers a different question a beginner actually asks (which is
 * the strongest? which pays the most cash? which is growing fastest?), so the
 * three cards never read as clones of each other.
 *
 * The card's big headline is built from the story's OWN number, not from the
 * signal service's `reason_en`. That matters: the backend generates reasons
 * from a handful of templates, so two cards can easily share the same
 * sentence. The headline stays unique because the number is inside it; the
 * signal reason drops to a smaller supporting line and is de-duplicated.
 *
 * Everything here runs off the /api/scores payload the homepage already
 * fetches — no extra requests.
 */

export type StoryKey = "strongest" | "dividend" | "growth";

/** Which of the three metric columns this card's own story owns (tinted). */
export type StoryMetric = "score" | "yield" | "growth";

export interface StoryStock {
  key: StoryKey;
  item: ScoreItem;
  /** Story-specific headline — always unique, because the number is in it. */
  headline: string;
  highlight: StoryMetric;
  /** Signal reason, or null when a card above already used this exact sentence. */
  reasonEn: string | null;
  reasonBn: string | null;
}

/**
 * Quality floor for the dividend + growth cards. Without it the "fastest
 * growing" slot goes to whatever micro-cap posted a freak jump — which would
 * contradict our own ranking on the very next section. 60 is the fallback so
 * the section still fills on a thin day.
 */
const QUALITY_FLOOR = 70;
const QUALITY_FLOOR_FALLBACK = 60;

/**
 * A stock is only featurable if we can actually stand behind it: real score,
 * a live price, financials that aren't years out of date, and not in DSE's
 * junk Z category.
 */
function isEligible(s: ScoreItem): boolean {
  return (
    s.score != null &&
    s.ltp != null &&
    !s.stale_data &&
    s.market_category !== "Z"
  );
}

/** Highest `metric` among stocks clearing `floor`, skipping ones already used. */
function bestBy(
  pool: ScoreItem[],
  metric: (s: ScoreItem) => number | null | undefined,
  taken: Set<string>,
  floor: number,
): ScoreItem | null {
  let best: ScoreItem | null = null;
  let bestVal = -Infinity;
  for (const s of pool) {
    if (taken.has(s.trading_code)) continue;
    if ((s.score ?? 0) < floor) continue;
    const v = metric(s);
    if (v == null || v <= 0) continue;
    if (v > bestVal) {
      bestVal = v;
      best = s;
    }
  }
  return best;
}

/** Try the strict quality floor first, then relax so the card still fills. */
function bestByRelaxed(
  pool: ScoreItem[],
  metric: (s: ScoreItem) => number | null | undefined,
  taken: Set<string>,
): ScoreItem | null {
  return (
    bestBy(pool, metric, taken, QUALITY_FLOOR) ??
    bestBy(pool, metric, taken, QUALITY_FLOOR_FALLBACK)
  );
}

function pct(n: number): string {
  // One decimal only when it says something (10.9% but 5% not 5.0%).
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function growthHeadline(yoy: number): string {
  if (yoy >= 200) return "Earnings tripled in a single year.";
  if (yoy >= 100) return "Earnings more than doubled in a single year.";
  return `Earnings jumped ${Math.round(yoy)}% in a single year.`;
}

/**
 * Pick the three story stocks, in priority order, without repeating a stock
 * (the top-scoring name often also leads on dividend yield).
 *
 * Returns [] when we can't fill all three — the section then renders nothing
 * rather than showing a lopsided grid.
 */
export function pickStoryStocks(all: ScoreItem[], totalCount: number): StoryStock[] {
  const pool = all.filter(isEligible);
  if (pool.length === 0) return [];

  const taken = new Set<string>();
  const out: StoryStock[] = [];

  const strongest = [...pool].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;
  if (strongest) {
    taken.add(strongest.trading_code);
    out.push({
      key: "strongest",
      item: strongest,
      headline: `The highest score of all ${totalCount} companies we track.`,
      highlight: "score",
      reasonEn: null,
      reasonBn: null,
    });
  }

  const dividend = bestByRelaxed(pool, (s) => s.div_yield_pct, taken);
  if (dividend) {
    taken.add(dividend.trading_code);
    out.push({
      key: "dividend",
      item: dividend,
      headline: `Pays ${pct(dividend.div_yield_pct as number)}% a year in cash — the biggest of any strong company.`,
      highlight: "yield",
      reasonEn: null,
      reasonBn: null,
    });
  }

  const growth = bestByRelaxed(pool, (s) => s.eps_yoy_pct, taken);
  if (growth) {
    taken.add(growth.trading_code);
    out.push({
      key: "growth",
      item: growth,
      headline: growthHeadline(growth.eps_yoy_pct as number),
      highlight: "growth",
      reasonEn: null,
      reasonBn: null,
    });
  }

  if (out.length < 3) return [];

  // Attach the signal reason, dropping any sentence a card above already used
  // so the three cards never print the same line twice.
  const usedEn = new Set<string>();
  for (const card of out) {
    const sig = card.item.signal;
    const en = sig?.reason_en?.trim() || null;
    if (en && !usedEn.has(en)) {
      usedEn.add(en);
      card.reasonEn = en;
      card.reasonBn = sig?.reason_bn?.trim() || null;
    }
  }

  return out;
}
