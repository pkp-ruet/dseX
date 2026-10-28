import type { LatestResultRow } from "@/lib/api";
import type { StockRowTone } from "@/components/ui/StockRow";

/** How a quarterly report reads against the same months last year: the one
 *  set of words for the stock-page card, the /results feed and the dashboard.
 *  `means` is what puts a report in the group — it mirrors the level rules in
 *  backend services/results_explainer.py `explain`, so keep the two in step. */
export const RESULT_LEVEL: Record<
  LatestResultRow["level"],
  { en: string; bn: string; short: string; shortBn: string; tone: StockRowTone; pill: string; means: string; meansBn: string }
> = {
  good: { en: "Better than last year", bn: "গত বছরের চেয়ে ভালো", short: "Better", shortBn: "ভালো",
          tone: "positive", pill: "text-positive bg-positive/10",
          means: "Profit per share is up 10% or more on the same months last year, or the company is back to a profit.",
          meansBn: "শেয়ারপ্রতি মুনাফা গত বছরের একই সময়ের চেয়ে 10% বা তার বেশি বেড়েছে, অথবা কোম্পানি আবার মুনাফায় ফিরেছে।" },
  watch: { en: "Mixed, worth watching", bn: "মিশ্র, নজর রাখার মতো", short: "Mixed", shortBn: "মিশ্র",
           tone: "watch", pill: "text-watch bg-watch/10",
           means: "Profit is down 10% to 25%, or it is up but the cash didn't come in, or the latest quarter slowed down.",
           meansBn: "মুনাফা 10% থেকে 25% কমেছে, অথবা বেড়েছে কিন্তু নগদ আসেনি, অথবা সর্বশেষ প্রান্তিকে গতি কমেছে।" },
  bad: { en: "Weaker than last year", bn: "গত বছরের চেয়ে দুর্বল", short: "Weaker", shortBn: "দুর্বল",
         tone: "negative", pill: "text-negative bg-negative/10",
         means: "The company made a loss this year, or profit per share fell by a quarter or more.",
         meansBn: "এ বছর কোম্পানি লোকসানে আছে, অথবা শেয়ারপ্রতি মুনাফা এক-চতুর্থাংশ বা তার বেশি কমেছে।" },
  neutral: { en: "About the same", bn: "প্রায় আগের মতো", short: "About the same", shortBn: "প্রায় আগের মতো",
             tone: "muted", pill: "text-text-main bg-surface-2",
             means: "Profit per share is within 10% of the same months last year.",
             meansBn: "শেয়ারপ্রতি মুনাফা গত বছরের একই সময়ের 10%-এর মধ্যে আছে।" },
};

export const RESULT_LEVEL_ORDER: LatestResultRow["level"][] = ["good", "watch", "bad", "neutral"];

/** Profit per share as the report prints it: two decimals, ৳, a real minus. */
export function epsTk(v: number): string {
  return `${v < 0 ? "−" : ""}৳${Math.abs(v).toFixed(2)}`;
}

/** "Q3 · 9 months" — which report this is. */
export function quarterLabel(r: Pick<LatestResultRow, "quarter" | "months">): { en: string; bn: string } {
  const q = r.quarter ? `Q${r.quarter} · ` : "";
  return { en: `${q}${r.months} months`, bn: `${q}${r.months} মাস` };
}

/** The profit move a row leads with: "+17%", or words when a percentage
 *  can't say it (a loss on either side). Same cut-offs as the backend's
 *  `_move_words`: under 3% either way is "about the same". */
export function resultMove(r: LatestResultRow): { en: string; bn: string; tone: "positive" | "negative" | "muted"; words: boolean } {
  const cur = r.eps_cum ?? null;
  const prev = r.eps_cum_prev ?? null;
  if (cur != null && prev != null) {
    if (prev <= 0 && cur > 0) return { en: "Back to profit", bn: "মুনাফায় ফিরেছে", tone: "positive", words: true };
    if (cur < 0 && prev >= 0) return { en: "Turned to a loss", bn: "লোকসানে পড়েছে", tone: "negative", words: true };
    if (cur < 0 && prev < 0) {
      return cur > prev
        ? { en: "Smaller loss", bn: "লোকসান কমেছে", tone: "muted", words: true }
        : { en: "Bigger loss", bn: "লোকসান বেড়েছে", tone: "negative", words: true };
    }
  }
  const p = r.eps_yoy_pct;
  if (p == null) return { en: "No comparison", bn: "তুলনা নেই", tone: "muted", words: true };
  const s = `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p).toFixed(0)}%`;
  return { en: s, bn: s, tone: Math.abs(p) < 3 ? "muted" : p > 0 ? "positive" : "negative", words: false };
}
