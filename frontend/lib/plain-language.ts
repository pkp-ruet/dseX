import type { SignalFlags } from "@/lib/api";
import { getTier, type TierKey } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

const VERDICT_WORDS: Record<TierKey, string> = {
  strong_buy:    "Strong Buy",
  buy:           "Buy",
  keep_watching: "Watch",
  avoid:         "Risky",
};

const VERDICT_TONES: Record<TierKey, { color: string; bg: string; border: string; soft: string }> = {
  strong_buy:    { color: "#34D399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.45)",  soft: "rgba(52,211,153,0.06)"  },
  buy:           { color: "#4ADE80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.45)",  soft: "rgba(74,222,128,0.06)"  },
  keep_watching: { color: "#FBBF24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.45)",  soft: "rgba(251,191,36,0.06)"  },
  avoid:         { color: "#F87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.45)", soft: "rgba(248,113,113,0.06)" },
};

export function verdictHeadline(score: number | null): string {
  return VERDICT_WORDS[getTier(score)];
}

export function verdictTone(score: number | null): typeof VERDICT_TONES[TierKey] {
  return VERDICT_TONES[getTier(score)];
}

// ---------------------------------------------------------------------------
// Signal flag translation (backend → retail-friendly)
// ---------------------------------------------------------------------------

export interface VerdictReason {
  type: "good" | "watch";
  text: string;
}

export function friendlyFlag(flag: string): string {
  const spon = flag.match(/^Sponsor holding ([\d.]+)% \(strong alignment\)$/);
  if (spon) return `Owners (sponsors) hold ${Math.round(Number(spon[1]))}% — they have skin in the game`;

  const payout = flag.match(/^Payout ratio (\d+)% — potentially unsustainable$/);
  if (payout) return `Pays out ${payout[1]}% of profits as dividends — may be hard to keep up`;

  const cat = flag.match(/^Market category: (\w+) \(not 'A'\)$/);
  if (cat) return `Listed in category ${cat[1]} — not the top tier (A)`;

  const map: Record<string, string> = {
    "EPS positive 4+ of 5 years": "Made profits in 4 out of the last 5 years",
    "CFO positive 3+ years": "Generates real cash from its day-to-day business",
    "Consistent dividend payer (4+ years)": "Pays a dividend every year, like clockwork",
    "Currently cheap vs historical P/E": "Currently priced cheaper than its own history",
    "Latest EPS is negative": "Lost money in the most recent year",
    "Total loan > 2× reserve surplus": "Carries more debt than its retained savings",
    "P/E more than 20% above 5yr average": "Priced richer than its 5-year average",
  };
  return map[flag] ?? flag;
}

/** Pick up to 3 strongest reasons — green first, then watch items if room. */
export function pickTopReasons(flags: SignalFlags, max = 3): VerdictReason[] {
  const out: VerdictReason[] = [];
  for (const g of flags.green) {
    if (out.length >= max) break;
    out.push({ type: "good", text: friendlyFlag(g) });
  }
  if (out.length < max) {
    for (const r of flags.red) {
      if (out.length >= max) break;
      out.push({ type: "watch", text: friendlyFlag(r) });
    }
  }
  return out;
}

export function watchItems(flags: SignalFlags): string[] {
  return flags.red.map(friendlyFlag);
}

// ---------------------------------------------------------------------------
// Hero — 52w range
// ---------------------------------------------------------------------------

export interface Range52w {
  caption: string;
  position: number; // 0..1, where current sits between low and high
  tone: "high" | "mid" | "low";
}

export function range52wInfo(
  ltp: number | null,
  w52high: number | null,
  w52low: number | null,
): Range52w | null {
  if (ltp == null || w52high == null || w52low == null || w52high <= w52low) return null;
  const raw = (ltp - w52low) / (w52high - w52low);
  const position = Math.max(0, Math.min(1, raw));
  if (position > 0.85) return { caption: "Near its 1-year high", position, tone: "high" };
  if (position < 0.15) return { caption: "Near its 1-year low", position, tone: "low" };
  return { caption: "In its normal range", position, tone: "mid" };
}

// ---------------------------------------------------------------------------
// Price chart — caption based on first/last/peak in selected range
// ---------------------------------------------------------------------------

export function priceTrendCaption(
  data: { ltp: number }[],
  rangeLabel: string,
): string | null {
  if (data.length < 2) return null;
  const first = data[0].ltp;
  const last = data[data.length - 1].ltp;
  if (first <= 0) return null;

  const peak = data.reduce((m, d) => Math.max(m, d.ltp), -Infinity);
  const pct = ((last - first) / first) * 100;
  const fromPeak = peak > 0 ? ((last - peak) / peak) * 100 : 0;

  const wordMap: Record<string, string> = {
    "1M": "over the past month",
    "6M": "over the past 6 months",
    "1Y": "over the past year",
    "2Y": "over the past 2 years",
    "All": "across all available history",
  };
  const word = wordMap[rangeLabel] ?? `over the past ${rangeLabel.toLowerCase()}`;

  if (pct < -15 && Math.abs(fromPeak) > Math.abs(pct) + 5) {
    return `Down ${Math.abs(pct).toFixed(0)}% ${word} — ${Math.abs(fromPeak).toFixed(0)}% below its peak`;
  }
  if (pct >= 0) return `Up ${pct.toFixed(0)}% ${word}`;
  return `Down ${Math.abs(pct).toFixed(0)}% ${word}`;
}

// ---------------------------------------------------------------------------
// Health Check (replaces the 5 score pillars)
// ---------------------------------------------------------------------------

export type HealthStatus = "strong" | "fair" | "weak";

export interface HealthCheckRow {
  pillarKey: string;
  status: HealthStatus;
  headline: string;
  oneLine: string;
  learnMore: string;
}

const PILLAR_PHRASES: Record<string, [HealthCheckRow, HealthCheckRow, HealthCheckRow]> = {
  p1_biz: [
    { pillarKey: "p1_biz", status: "strong", headline: "Strong Profitability",
      oneLine: "This company makes consistent profits year after year.",
      learnMore: "Earnings have been positive and steady across recent years — a sign that the underlying business is healthy and well-run." },
    { pillarKey: "p1_biz", status: "fair", headline: "Mixed Profitability",
      oneLine: "Profits are okay, but uneven from year to year.",
      learnMore: "Earnings have been positive most years but with ups and downs. Worth watching how the business performs over the next year or two." },
    { pillarKey: "p1_biz", status: "weak", headline: "Weak Profitability",
      oneLine: "Profits are inconsistent or declining.",
      learnMore: "Earnings have struggled — losses, falling profits, or stagnation. Investing here means betting on a turnaround." },
  ],
  p2_health: [
    { pillarKey: "p2_health", status: "strong", headline: "Healthy Balance Sheet",
      oneLine: "Low debt and steady cash flow keep this company on solid ground.",
      learnMore: "The company doesn't owe too much, generates enough cash to pay its bills, and has a buffer for hard times." },
    { pillarKey: "p2_health", status: "fair", headline: "Acceptable Balance Sheet",
      oneLine: "Finances are okay but not bulletproof.",
      learnMore: "Debt is manageable and cash flow exists, but there's less margin for error if business slows down." },
    { pillarKey: "p2_health", status: "weak", headline: "Stretched Finances",
      oneLine: "Debt or cash flow concerns mean less room to maneuver.",
      learnMore: "High debt or weak cash generation can make a company fragile — especially during tough markets." },
  ],
  p3_moat: [
    { pillarKey: "p3_moat", status: "strong", headline: "Strong Business Position",
      oneLine: "Holds a defensible spot in its industry.",
      learnMore: "Competitors find it hard to take market share. Strong margins and steady revenue suggest the company has real advantages — brand, scale, or know-how." },
    { pillarKey: "p3_moat", status: "fair", headline: "Average Business Position",
      oneLine: "Holds its own but doesn't dominate.",
      learnMore: "Faces normal competition. Margins and growth are okay, not exceptional." },
    { pillarKey: "p3_moat", status: "weak", headline: "Weak Business Position",
      oneLine: "Faces tough competition with limited pricing power.",
      learnMore: "Slim margins, unstable revenue, or lots of competition. The company is more vulnerable to industry pressures." },
  ],
  p4_val: [
    { pillarKey: "p4_val", status: "strong", headline: "Fair Price",
      oneLine: "Currently priced at a discount to its own history.",
      learnMore: "The market is asking less for this stock today than it usually has — could be a chance to buy quality at a sale." },
    { pillarKey: "p4_val", status: "fair", headline: "Reasonably Priced",
      oneLine: "Roughly in line with its usual valuation.",
      learnMore: "Not a bargain, not overpriced — the price reflects the company's typical worth." },
    { pillarKey: "p4_val", status: "weak", headline: "Looks Expensive",
      oneLine: "Currently priced richer than its own history.",
      learnMore: "You'd be paying more than usual for what this company earns. Worth waiting for a better entry, or being sure of the growth case." },
  ],
  p5_div: [
    { pillarKey: "p5_div", status: "strong", headline: "Generous Dividends",
      oneLine: "Pays reliable, growing dividends to shareholders.",
      learnMore: "A steady dividend stream means the company shares its profits with you regularly — and the payout has been growing." },
    { pillarKey: "p5_div", status: "fair", headline: "Moderate Dividends",
      oneLine: "Pays dividends, but not consistently or generously.",
      learnMore: "Dividends exist but the payout history is uneven. You can earn some income but it's not guaranteed year-to-year." },
    { pillarKey: "p5_div", status: "weak", headline: "Few Dividends",
      oneLine: "Doesn't reliably return cash to shareholders.",
      learnMore: "Limited or no dividend history. If you're looking for income, this isn't the stock for it." },
  ],
};

export function pillarHealthCheck(
  pillarKey: string,
  score: number | null,
): HealthCheckRow | null {
  if (score == null) return null;
  const triplet = PILLAR_PHRASES[pillarKey];
  if (!triplet) return null;
  if (score >= 7) return triplet[0];
  if (score >= 4) return triplet[1];
  return triplet[2];
}

export const HEALTH_PILLAR_ORDER = ["p1_biz", "p2_health", "p3_moat", "p4_val", "p5_div"];

// ---------------------------------------------------------------------------
// Profit chart caption
// ---------------------------------------------------------------------------

export function profitTrendCaption(profits: (number | null)[]): string | null {
  const valid = profits.filter((p): p is number => p != null);
  if (valid.length < 2) return null;
  const positive = valid.filter((p) => p > 0).length;
  const total = valid.length;
  const last = valid[valid.length - 1];
  const first = valid[0];

  if (positive === total && total >= 3) return `Made a profit every year for ${total} years.`;
  if (positive >= Math.max(3, total - 1)) return `Profitable in ${positive} out of the last ${total} years.`;
  if (last < 0) return `Lost money in the most recent year.`;
  if (first > 0 && last > first * 1.2) return `Profits are trending up over time.`;
  if (first > 0 && last < first * 0.8) return `Profits are trending down over time.`;
  return `Profit history has been mixed across the years.`;
}

// ---------------------------------------------------------------------------
// EPS caption
// ---------------------------------------------------------------------------

export function epsCaption(epsValues: (number | null)[]): string | null {
  const valid = epsValues.filter((v): v is number => v != null);
  if (!valid.length) return null;
  const latest = valid[valid.length - 1];
  const total = valid.length;
  const positive = valid.filter((v) => v > 0).length;
  if (latest < 0) return `Each share lost ৳${Math.abs(latest).toFixed(1)} in the latest year.`;
  if (positive === total && total >= 3 && valid[0] > 0 && latest > valid[0] * 1.2) {
    return `Earnings per share have been growing — ৳${latest.toFixed(1)} latest.`;
  }
  if (positive === total && total >= 3) return `Profitable per share every year for ${total} years.`;
  return `Each share earned ৳${latest.toFixed(1)} in the latest year.`;
}

// ---------------------------------------------------------------------------
// Dividend caption
// ---------------------------------------------------------------------------

export function dividendStreakCaption(cashPcts: number[]): string | null {
  if (!cashPcts.length) return null;
  let streak = 0;
  for (let i = cashPcts.length - 1; i >= 0; i--) {
    if (cashPcts[i] > 0) streak++;
    else break;
  }
  if (streak === 0) return "No cash dividend in the most recent year.";
  if (streak === 1) return "Paid a dividend last year.";
  return `Paid a dividend every year for ${streak} years running.`;
}

// ---------------------------------------------------------------------------
// Ownership caption
// ---------------------------------------------------------------------------

export function ownershipCaption(sponsorPct: number | null): string | null {
  if (sponsorPct == null) return null;
  const r = Math.round(sponsorPct);
  if (sponsorPct >= 50) return `Owners (sponsors) hold ${r}% — heavily invested in the company's success.`;
  if (sponsorPct >= 30) return `Owners (sponsors) hold ${r}% — a strong sign of commitment.`;
  if (sponsorPct >= 20) return `Owners (sponsors) hold ${r}% — modest skin in the game.`;
  return `Owners (sponsors) hold only ${r}% — limited alignment with shareholders.`;
}
