/**
 * "Your own ranking" (Premium, 2026-10-31): the reader says which of the five
 * checks matter more or less to them and the table re-orders. Pure helpers;
 * the sheet lives in `YourRankingSheet.tsx`.
 *
 * Our score is a weighted sum of the five checks (each 0–10): profit 30%,
 * finances 20%, business 20%, price 15%, dividend 15% (scoring_service), then
 * cut for a Z / B category or old accounts. A reader's weights rescale the
 * sum; the same cut is kept (score ÷ our own weighted sum), so a Z company
 * doesn't climb just because the reader moved a slider.
 */

import type { ScoreItem } from "@/lib/api";

export type Weight = "less" | "normal" | "more";
export type Weights = [Weight, Weight, Weight, Weight, Weight];

/** Our weights, P1..P5. */
export const BASE_WEIGHTS = [0.3, 0.2, 0.2, 0.15, 0.15];
const FACTOR: Record<Weight, number> = { less: 0.5, normal: 1, more: 2 };
export const DEFAULT_WEIGHTS: Weights = ["normal", "normal", "normal", "normal", "normal"];
export const WEIGHTS_KEY = "dsex.rank.weights";

export const isDefault = (w: Weights) => w.every((x) => x === "normal");

function pillars(i: ScoreItem): (number | null)[] {
  return [i.p1_biz ?? null, i.p2_health ?? null, i.p3_moat ?? null, i.p4_val ?? null, i.p5_div ?? null];
}

function weighted(vals: (number | null)[], ws: number[]): number | null {
  let sum = 0;
  let wsum = 0;
  vals.forEach((v, k) => {
    if (v == null) return;
    sum += v * ws[k];
    wsum += ws[k];
  });
  return wsum > 0 ? (sum / wsum) * 10 : null;
}

/** The company's score under the reader's weights, 0–100 (null = unscored). */
export function customScore(i: ScoreItem, w: Weights): number | null {
  if (i.score == null) return null;
  const vals = pillars(i);
  const ours = weighted(vals, BASE_WEIGHTS);
  const theirs = weighted(vals, BASE_WEIGHTS.map((b, k) => b * FACTOR[w[k]]));
  if (ours == null || theirs == null || ours <= 0) return i.score;
  return Math.min(100, theirs * (i.score / ours));
}

export function readWeights(): Weights | null {
  try {
    const raw = localStorage.getItem(WEIGHTS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (Array.isArray(v) && v.length === 5 && v.every((x) => x === "less" || x === "normal" || x === "more")) {
      return v as Weights;
    }
  } catch {}
  return null;
}

export function saveWeights(w: Weights): void {
  try {
    if (isDefault(w)) localStorage.removeItem(WEIGHTS_KEY);
    else localStorage.setItem(WEIGHTS_KEY, JSON.stringify(w));
  } catch {}
}

/** "Best value" order: Good / Excellent companies first, the cheapest
 *  (highest price check) first among them, then by score. */
export function bestValueKey(i: ScoreItem): [number, number, number] {
  const good = (i.score ?? 0) >= 60 ? 1 : 0;
  return [good, i.p4_val ?? -1, i.score ?? -1];
}
