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
 * The three stocks rotate daily (see `pickStoryStocks`) so the section is worth
 * coming back to, drawing only from each story's top handful of candidates.
 *
 * Everything here runs off the /api/scores payload the homepage already
 * fetches — no extra requests.
 */

export type StoryKey = "strongest" | "dividend" | "growth";

/** Per-story identity: label, glyph and accent. ৳ for the cash card is
 *  deliberate. Shared by the marketing section and the dashboard card. */
export const STORY_META: Record<StoryKey, { label: string; glyph: string; color: string; ink: string }> = {
  strongest: { label: "The strongest", glyph: "★", color: "var(--tier-excellent)", ink: "var(--tier-excellent)" },
  dividend: { label: "Biggest dividend", glyph: "৳", color: "var(--warm)", ink: "var(--warm-ink)" },
  growth: { label: "Fastest growing", glyph: "▲", color: "var(--primary)", ink: "var(--primary-ink)" },
};

/** Which of the three metric columns this card's own story owns (tinted). */
export type StoryMetric = "score" | "yield" | "growth";

export interface StoryStock {
  key: StoryKey;
  item: ScoreItem;
  /** Story-specific headline — always unique, because the number is in it. */
  headline: string;
  /** Same claim as `headline`, trimmed for the narrow dashboard card. */
  shortLine: string;
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
 * How many candidates each story rotates through. The card is meant to feel
 * fresh every day, but it must never step outside the genuinely best names —
 * so we take the top few for that story and walk the list one per day.
 */
const ROTATION_POOL = 6;

/** A thin day: below this many strict-floor candidates, relax the floor so the
 *  story still has something to rotate through instead of pinning one stock. */
const MIN_ROTATION = 3;

/** Per-story offsets so the three cards don't all turn over on the same day. */
const DAY_OFFSET: Record<StoryKey, number> = { strongest: 0, dividend: 2, growth: 4 };

/**
 * Days since the epoch on the market's own calendar (Dhaka is UTC+6, no DST).
 * Derived from absolute epoch ms, so a device in any timezone lands on the same
 * day number — the rotation is identical for every reader.
 */
export function marketDayIndex(now: Date = new Date()): number {
  return Math.floor((now.getTime() + 6 * 3_600_000) / 86_400_000);
}

/** The day's entry in a rotation list. */
function pickForDay<T>(list: T[], day: number, offset: number): T | null {
  if (list.length === 0) return null;
  const n = list.length;
  return list[(((day + offset) % n) + n) % n];
}

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

/** Top `ROTATION_POOL` stocks by `metric` among those clearing `floor`, best
 *  first, skipping ones an earlier card already claimed. */
function poolBy(
  pool: ScoreItem[],
  metric: (s: ScoreItem) => number | null | undefined,
  taken: Set<string>,
  floor: number,
): ScoreItem[] {
  return pool
    .filter((s) => {
      if (taken.has(s.trading_code)) return false;
      if ((s.score ?? 0) < floor) return false;
      const v = metric(s);
      return v != null && v > 0;
    })
    .sort((a, b) => (metric(b) ?? 0) - (metric(a) ?? 0))
    .slice(0, ROTATION_POOL);
}

/** Strict quality floor when the board is deep enough to rotate through, else
 *  relaxed so the card still fills — and still changes — on a thin day. */
function poolByRelaxed(
  pool: ScoreItem[],
  metric: (s: ScoreItem) => number | null | undefined,
  taken: Set<string>,
): ScoreItem[] {
  const strict = poolBy(pool, metric, taken, QUALITY_FLOOR);
  return strict.length >= MIN_ROTATION ? strict : poolBy(pool, metric, taken, QUALITY_FLOOR_FALLBACK);
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

function growthShort(yoy: number): string {
  if (yoy >= 200) return "Earnings tripled in one year.";
  if (yoy >= 100) return "Earnings more than doubled in one year.";
  return `Earnings up ${Math.round(yoy)}% in one year.`;
}

/**
 * Pick the three story stocks, in priority order, without repeating a stock
 * (the top-scoring name often also leads on dividend yield).
 *
 * Each story rotates through its own top handful of candidates, one step per
 * calendar day, so a reader who comes back tomorrow sees different companies
 * without us ever featuring something we wouldn't stand behind. Pass `day` to
 * pin the rotation (tests, or a caller with its own clock).
 *
 * Returns [] when we can't fill all three — the section then renders nothing
 * rather than showing a lopsided grid.
 */
export function pickStoryStocks(
  all: ScoreItem[],
  totalCount: number,
  day: number = marketDayIndex(),
): StoryStock[] {
  const pool = all.filter(isEligible);
  if (pool.length === 0) return [];

  const taken = new Set<string>();
  const out: StoryStock[] = [];

  const byScore = [...pool].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, ROTATION_POOL);
  const strongest = pickForDay(byScore, day, DAY_OFFSET.strongest);
  if (strongest) {
    const rank = byScore.indexOf(strongest);
    taken.add(strongest.trading_code);
    out.push({
      key: "strongest",
      item: strongest,
      headline:
        rank === 0
          ? `The highest score of all ${totalCount} companies we track.`
          : `Ranked #${rank + 1} for overall strength out of all ${totalCount} companies we track.`,
      shortLine:
        rank === 0
          ? `Highest score of all ${totalCount} companies.`
          : `#${rank + 1} strongest of ${totalCount} companies.`,
      highlight: "score",
      reasonEn: null,
      reasonBn: null,
    });
  }

  const divPool = poolByRelaxed(pool, (s) => s.div_yield_pct, taken);
  const dividend = pickForDay(divPool, day, DAY_OFFSET.dividend);
  if (dividend) {
    const isTop = divPool.indexOf(dividend) === 0;
    taken.add(dividend.trading_code);
    out.push({
      key: "dividend",
      item: dividend,
      headline: `Pays ${pct(dividend.div_yield_pct as number)}% a year in cash — ${
        isTop ? "the biggest of any strong company" : "one of the biggest among strong companies"
      }.`,
      shortLine: isTop
        ? "Biggest cash payout of any strong company."
        : "One of the biggest cash payouts around.",
      highlight: "yield",
      reasonEn: null,
      reasonBn: null,
    });
  }

  const growthPool = poolByRelaxed(pool, (s) => s.eps_yoy_pct, taken);
  const growth = pickForDay(growthPool, day, DAY_OFFSET.growth);
  if (growth) {
    taken.add(growth.trading_code);
    out.push({
      key: "growth",
      item: growth,
      headline: growthHeadline(growth.eps_yoy_pct as number),
      shortLine: growthShort(growth.eps_yoy_pct as number),
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
