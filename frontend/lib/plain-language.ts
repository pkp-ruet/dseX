import type { SignalFlags, MomentumSnapshot } from "@/lib/api";
import { getTier, type TierKey } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

const VERDICT_WORDS: Record<TierKey, string> = {
  excellent: "Excellent",
  good:      "Good",
  average:   "Average",
  weak:      "Weak",
};

const VERDICT_TONES: Record<TierKey, { color: string; bg: string; border: string; soft: string }> = {
  excellent: { color: "var(--tier-excellent)", bg: "color-mix(in srgb, var(--tier-excellent) 12%, transparent)", border: "color-mix(in srgb, var(--tier-excellent) 40%, transparent)", soft: "color-mix(in srgb, var(--tier-excellent) 6%, transparent)" },
  good:      { color: "var(--tier-good)",      bg: "color-mix(in srgb, var(--tier-good) 12%, transparent)",      border: "color-mix(in srgb, var(--tier-good) 40%, transparent)",      soft: "color-mix(in srgb, var(--tier-good) 6%, transparent)" },
  average:   { color: "var(--tier-average)",   bg: "color-mix(in srgb, var(--tier-average) 12%, transparent)",   border: "color-mix(in srgb, var(--tier-average) 40%, transparent)",   soft: "color-mix(in srgb, var(--tier-average) 6%, transparent)" },
  weak:      { color: "var(--tier-weak)",      bg: "color-mix(in srgb, var(--tier-weak) 12%, transparent)",      border: "color-mix(in srgb, var(--tier-weak) 40%, transparent)",      soft: "color-mix(in srgb, var(--tier-weak) 6%, transparent)" },
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
    "5Y": "over the past 5 years",
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
    { pillarKey: "p1_biz", status: "strong", headline: "Good Profit",
      oneLine: "Makes profit every year.",
      learnMore: "The company has earned money steadily for years. Business is running well." },
    { pillarKey: "p1_biz", status: "fair", headline: "Profit Goes Up and Down",
      oneLine: "Some years good, some years not.",
      learnMore: "Profit changes a lot from year to year. Watch how it does over the next year or two before making a big bet." },
    { pillarKey: "p1_biz", status: "weak", headline: "Weak Profit",
      oneLine: "Loses money or barely breaks even.",
      learnMore: "The company has struggled to earn money. Buying this means hoping things turn around." },
  ],
  p2_health: [
    { pillarKey: "p2_health", status: "strong", headline: "Strong Money Health",
      oneLine: "Low loans, plenty of cash.",
      learnMore: "The company does not owe much and earns enough cash to run smoothly, even in bad times." },
    { pillarKey: "p2_health", status: "fair", headline: "Okay Money Health",
      oneLine: "Loans and cash are fine, not great.",
      learnMore: "The company can pay its bills, but it does not have a big cushion if business slows down." },
    { pillarKey: "p2_health", status: "weak", headline: "Weak Money Health",
      oneLine: "Too much loan or too little cash.",
      learnMore: "Heavy loans or low cash can make the company shaky, especially when the market falls." },
  ],
  p3_moat: [
    { pillarKey: "p3_moat", status: "strong", headline: "Strong Business",
      oneLine: "Holds a strong spot in its industry.",
      learnMore: "Other companies find it hard to take its customers. Good profit margin and steady sales show real strength." },
    { pillarKey: "p3_moat", status: "fair", headline: "Average Business",
      oneLine: "Doing okay, not the leader.",
      learnMore: "Faces normal competition. Profit and sales are fine, nothing special." },
    { pillarKey: "p3_moat", status: "weak", headline: "Weak Business",
      oneLine: "Lots of competition, thin profit.",
      learnMore: "Small profit margin, shaky sales, many rivals. Easily hurt when the industry has trouble." },
  ],
  p4_val: [
    { pillarKey: "p4_val", status: "strong", headline: "Cheap Price Now",
      oneLine: "Priced lower than usual today.",
      learnMore: "The market is asking less for this stock today than it has in past years. Could be a chance to buy a good company on sale." },
    { pillarKey: "p4_val", status: "fair", headline: "Fair Price",
      oneLine: "Priced about normal.",
      learnMore: "Not cheap, not expensive — close to its usual price." },
    { pillarKey: "p4_val", status: "weak", headline: "Looks Costly",
      oneLine: "Priced higher than usual today.",
      learnMore: "You are paying more than usual right now. Better to wait for a lower price, unless you are very sure of fast growth." },
  ],
  p5_div: [
    { pillarKey: "p5_div", status: "strong", headline: "Strong Dividend",
      oneLine: "Pays good cash dividend every year.",
      learnMore: "Gives you cash from its profit every year, and the amount has been growing. Good for steady income." },
    { pillarKey: "p5_div", status: "fair", headline: "Some Dividend",
      oneLine: "Pays cash sometimes, not every year.",
      learnMore: "Sometimes pays, sometimes skips. You may earn some cash, but it is not sure every year." },
    { pillarKey: "p5_div", status: "weak", headline: "Low Dividend",
      oneLine: "Rarely pays cash to shareholders.",
      learnMore: "Little or no cash dividend history. Not the right stock if you want regular income." },
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

// ---------------------------------------------------------------------------
// Ownership change (latest vs previous shareholding snapshot)
// ---------------------------------------------------------------------------

export interface OwnershipChange {
  caption: string;
  tone: "positive" | "watch" | "neutral";
}

/** Plain-English read of the biggest insider/institution move between two
 *  shareholding snapshots. Returns null when nothing moved meaningfully. */
export function ownershipChangeInfo(
  current: Record<string, unknown> | null,
  previous: Record<string, unknown> | null,
  sinceLabel: string | null,
): OwnershipChange | null {
  if (!current || !previous) return null;
  const val = (rec: Record<string, unknown>, key: string): number | null => {
    const n = Number(rec[key]);
    return Number.isFinite(n) ? n : null;
  };

  const groups = [
    { key: "sponsor_director_pct", who: "Owners (sponsors)", upGood: true },
    { key: "institute_pct", who: "Big institutions", upGood: true },
    { key: "foreign_pct", who: "Foreign investors", upGood: true },
  ];

  let best: { who: string; from: number; to: number; delta: number; upGood: boolean } | null = null;
  for (const g of groups) {
    const to = val(current, g.key);
    const from = val(previous, g.key);
    if (to == null || from == null) continue;
    const delta = to - from;
    if (Math.abs(delta) < 0.5) continue;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { who: g.who, from, to, delta, upGood: g.upGood };
    }
  }
  if (!best) return null;

  const since = sinceLabel ? ` since ${sinceLabel}` : " since the last report";
  const fromS = best.from.toFixed(1);
  const toS = best.to.toFixed(1);

  if (best.delta > 0) {
    return {
      tone: "positive",
      caption: `Good sign — ${best.who.toLowerCase()} raised their stake from ${fromS}% to ${toS}%${since}. People close to the company are buying.`,
    };
  }
  return {
    tone: "watch",
    caption: `Worth watching — ${best.who.toLowerCase()} cut their stake from ${fromS}% to ${toS}%${since}. Keep an eye on why.`,
  };
}

// ---------------------------------------------------------------------------
// Momentum (7-day) — plain-English summary for the Momentum strip
// ---------------------------------------------------------------------------

export type MomentumTone = "positive" | "watch" | "negative" | "neutral";

export interface MomentumSummary {
  word: string;
  tone: MomentumTone;
  line: string;
}

/** Turn a momentum snapshot into a plain word + one supporting sentence. "Overall market", not "DSEX". */
export function momentumSummary(m: MomentumSnapshot): MomentumSummary | null {
  const grade = m.momentum_grade;
  if (!grade || grade === "unknown") return null;

  const WORDS: Record<string, { word: string; tone: MomentumTone }> = {
    hot:            { word: "Running hot",   tone: "positive" },
    warm:           { word: "Warming up",    tone: "positive" },
    flat:           { word: "Flat",          tone: "neutral" },
    cold:           { word: "Cooling off",   tone: "negative" },
    weak_liquidity: { word: "Thinly traded", tone: "watch" },
  };
  const meta = WORDS[grade] ?? { word: "Flat", tone: "neutral" as MomentumTone };

  const bits: string[] = [];
  const r7 = m.return_7d_pct;
  if (r7 != null) {
    bits.push(`${r7 >= 0 ? "up" : "down"} ${Math.abs(r7).toFixed(1)}% in the past week`);
  }
  const rs = m.rs_vs_dsex_pct;
  if (rs != null && Math.abs(rs) >= 0.5) {
    bits.push(rs > 0 ? "beating the overall market" : "lagging the overall market");
  }
  const vr = m.volume_ratio;
  if (vr != null && vr >= 1.3) bits.push("on heavier-than-usual trading");
  else if (vr != null && vr <= 0.7) bits.push("on lighter-than-usual trading");

  if (grade === "weak_liquidity") {
    return { ...meta, line: "Trades too little to read momentum reliably — moves can be sharp." };
  }

  const line = bits.length
    ? `${bits[0].charAt(0).toUpperCase()}${bits.slice(0, 3).join(", ").slice(1)}.`
    : "No clear short-term trend right now.";
  return { ...meta, line };
}

// ---------------------------------------------------------------------------
// Valuation caption (peer-relative, plain English)
// ---------------------------------------------------------------------------

export function valuationCaption(p4Score: number | null): string | null {
  if (p4Score == null) return null;
  if (p4Score >= 7) return "Looks cheap right now — priced below its usual level.";
  if (p4Score >= 4) return "Priced about fairly — neither a bargain nor expensive.";
  return "Looks pricey right now — costs more than usual for what you get.";
}

// ---------------------------------------------------------------------------
// Peer standing
// ---------------------------------------------------------------------------

export function peerStandingCaption(
  code: string,
  currentScore: number | null,
  peerScores: (number | null)[],
): string | null {
  if (currentScore == null) return null;
  const peers = peerScores.filter((s): s is number => s != null);
  if (!peers.length) return null;
  const beaten = peers.filter((s) => currentScore >= s).length;
  if (beaten === peers.length) return `${code} scores higher than every other strong name in its sector below.`;
  if (beaten === 0) return `${code} scores below the other strong names in its sector shown here.`;
  return `${code} scores higher than ${beaten} of ${peers.length} top sector peers shown below.`;
}
