import type { SignalFlags, MomentumSnapshot } from "@/lib/api";
import { getTier, TIER_VAR, type TierKey } from "@/lib/constants";

/**
 * The stock page's plain-language captions. Every caption is a pair — render it
 * with `<T {...pair} />` so the page reads in one language. Voice and words:
 * docs/voice.md (calm advisor; Bengali uses the words investors say; Western
 * digits).
 */
export type Bi = { en: string; bn: string };

// ---------------------------------------------------------------------------
// Verdict tone (grade colours)
// ---------------------------------------------------------------------------

type VerdictTone = { color: string; bg: string; border: string; soft: string };

function toneFor(tier: TierKey): VerdictTone {
  const c = TIER_VAR[tier];
  return {
    color: c,
    bg: `color-mix(in srgb, ${c} 12%, transparent)`,
    border: `color-mix(in srgb, ${c} 40%, transparent)`,
    soft: `color-mix(in srgb, ${c} 6%, transparent)`,
  };
}

const VERDICT_TONES: Record<TierKey, VerdictTone> = {
  excellent: toneFor("excellent"),
  good: toneFor("good"),
  average: toneFor("average"),
  weak: toneFor("weak"),
};

export function verdictTone(score: number | null): VerdictTone {
  return VERDICT_TONES[getTier(score)];
}

// ---------------------------------------------------------------------------
// Legacy signal flags (backend strings → plain words)
// ---------------------------------------------------------------------------

export function friendlyFlag(flag: string): Bi {
  const spon = flag.match(/^Sponsor holding ([\d.]+)% \(strong alignment\)$/);
  if (spon) {
    const r = Math.round(Number(spon[1]));
    return {
      en: `Sponsors and directors own ${r}% of the shares, so much of their own money is at stake.`,
      bn: `উদ্যোক্তা-পরিচালকদের হাতে ${r}% শেয়ার, অর্থাৎ কোম্পানিতে তাঁদের নিজের অনেক টাকা খাটছে।`,
    };
  }

  const payout = flag.match(/^Payout ratio (\d+)% — potentially unsustainable$/);
  if (payout) {
    return {
      en: `It pays out ${payout[1]}% of its profit as dividends. That may be hard to keep up.`,
      bn: `মুনাফার ${payout[1]}% ডিভিডেন্ড হিসেবে দিচ্ছে। এই হার ধরে রাখা কঠিন হতে পারে।`,
    };
  }

  const cat = flag.match(/^Market category: (\w+) \(not 'A'\)$/);
  if (cat) {
    return {
      en: `It is in category ${cat[1]}, not the top category (A).`,
      bn: `এটি ${cat[1]} ক্যাটাগরিতে আছে, সবচেয়ে ভালো A ক্যাটাগরিতে নয়।`,
    };
  }

  const map: Record<string, Bi> = {
    // Legacy backend string: it fired for 5-of-5 too, so say nothing it can't back.
    "EPS positive 4+ of 5 years": {
      en: "It made a profit in at least 4 of the last 5 years.",
      bn: "গত 5 বছরের অন্তত 4 বছর মুনাফা করেছে।",
    },
    "CFO positive 3+ years": {
      en: "Its day-to-day business brings in real cash.",
      bn: "দৈনন্দিন ব্যবসা থেকে সত্যিকারের নগদ টাকা আসছে।",
    },
    "Consistent dividend payer (4+ years)": {
      en: "It has paid a dividend every year.",
      bn: "প্রতি বছর ডিভিডেন্ড দিয়েছে।",
    },
    "Currently cheap vs historical P/E": {
      en: "Its price is lower than usual compared with its own past.",
      bn: "নিজের আগের দামের তুলনায় এখন দাম কম।",
    },
    "Latest EPS is negative": {
      en: "It made a loss in the most recent year.",
      bn: "সর্বশেষ বছরে লোকসান করেছে।",
    },
    "Total loan > 2× reserve surplus": {
      en: "Its loans are larger than the profit it has saved over the years.",
      bn: "বছরের পর বছর জমানো মুনাফার চেয়ে এর ঋণ বেশি।",
    },
    "P/E more than 20% above 5yr average": {
      en: "Its price is higher than its 5-year average compared with profit.",
      bn: "মুনাফার তুলনায় দাম এর 5 বছরের গড়ের চেয়ে বেশি।",
    },
  };
  return map[flag] ?? { en: flag, bn: flag };
}

export function watchItems(flags: SignalFlags): Bi[] {
  return flags.red.map(friendlyFlag);
}

// ---------------------------------------------------------------------------
// Hero — this year's range
// ---------------------------------------------------------------------------

export interface Range52w {
  caption: Bi;
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
  if (position > 0.85) {
    return { caption: { en: "Close to its highest price this year", bn: "এ বছরের সর্বোচ্চ দামের কাছাকাছি" }, position, tone: "high" };
  }
  if (position < 0.15) {
    return { caption: { en: "Close to its lowest price this year", bn: "এ বছরের সর্বনিম্ন দামের কাছাকাছি" }, position, tone: "low" };
  }
  return { caption: { en: "Within its usual range this year", bn: "এ বছরের স্বাভাবিক দামের মধ্যে" }, position, tone: "mid" };
}

// ---------------------------------------------------------------------------
// Price chart — caption based on first/last/peak in selected range
// ---------------------------------------------------------------------------

const RANGE_WORDS: Record<string, Bi> = {
  "1M": { en: "over the past month", bn: "গত এক মাসে" },
  "6M": { en: "over the past 6 months", bn: "গত 6 মাসে" },
  "1Y": { en: "over the past year", bn: "গত এক বছরে" },
  "2Y": { en: "over the past 2 years", bn: "গত 2 বছরে" },
  "5Y": { en: "over the past 5 years", bn: "গত 5 বছরে" },
  All: { en: "across all the history we have", bn: "আমাদের কাছে থাকা পুরো সময়ে" },
};

export function priceTrendCaption(data: { ltp: number }[], rangeLabel: string): Bi | null {
  if (data.length < 2) return null;
  const first = data[0].ltp;
  const last = data[data.length - 1].ltp;
  if (first <= 0) return null;

  const peak = data.reduce((m, d) => Math.max(m, d.ltp), -Infinity);
  const pct = ((last - first) / first) * 100;
  const fromPeak = peak > 0 ? ((last - peak) / peak) * 100 : 0;
  const w = RANGE_WORDS[rangeLabel] ?? { en: `over the past ${rangeLabel.toLowerCase()}`, bn: `গত ${rangeLabel}-এ` };
  const p = Math.abs(pct).toFixed(0);

  if (pct < -15 && Math.abs(fromPeak) > Math.abs(pct) + 5) {
    const fp = Math.abs(fromPeak).toFixed(0);
    return {
      en: `The price fell ${p}% ${w.en}. It is ${fp}% below its highest point.`,
      bn: `${w.bn} দাম ${p}% কমেছে। সর্বোচ্চ দামের চেয়ে এখন ${fp}% নিচে।`,
    };
  }
  if (pct >= 0) return { en: `The price rose ${p}% ${w.en}.`, bn: `${w.bn} দাম ${p}% বেড়েছে।` };
  return { en: `The price fell ${p}% ${w.en}.`, bn: `${w.bn} দাম ${p}% কমেছে।` };
}

// ---------------------------------------------------------------------------
// Health check (the five checks behind the score)
// ---------------------------------------------------------------------------

export type HealthStatus = "strong" | "fair" | "weak";

export interface HealthCheckRow {
  pillarKey: string;
  status: HealthStatus;
  headline: string;
  oneLine: string;
  learnMore: string;
  /** Same three lines in everyday Bengali (Western digits only). */
  headlineBn: string;
  oneLineBn: string;
  learnMoreBn: string;
}

const row = (
  pillarKey: string,
  status: HealthStatus,
  en: [string, string, string],
  bn: [string, string, string],
): HealthCheckRow => ({
  pillarKey,
  status,
  headline: en[0],
  oneLine: en[1],
  learnMore: en[2],
  headlineBn: bn[0],
  oneLineBn: bn[1],
  learnMoreBn: bn[2],
});

const PILLAR_PHRASES: Record<string, [HealthCheckRow, HealthCheckRow, HealthCheckRow]> = {
  p1_biz: [
    row("p1_biz", "strong",
      ["Steady profit", "It makes a profit year after year.", "The company has earned a profit steadily for several years. Its business is running well."],
      ["নিয়মিত মুনাফা", "বছরের পর বছর মুনাফা করছে।", "কোম্পানিটি কয়েক বছর ধরে নিয়মিত মুনাফা করেছে। ব্যবসা ভালোভাবে চলছে।"]),
    row("p1_biz", "fair",
      ["Uneven profit", "Some years are good, others are not.", "Profit changes a lot from one year to the next. It is worth watching the next year or two before investing a large amount."],
      ["অসমান মুনাফা", "কোনো বছর ভালো, কোনো বছর নয়।", "মুনাফা এক বছর থেকে আরেক বছরে অনেক বদলায়। বড় অঙ্কে বিনিয়োগের আগে আগামী এক-দুই বছর দেখে নেওয়া ভালো।"]),
    row("p1_biz", "weak",
      ["Weak profit", "It makes a loss or only a small profit.", "The company has found it hard to make money. Buying now means expecting the business to improve."],
      ["দুর্বল মুনাফা", "লোকসান করছে, বা মুনাফা খুব সামান্য।", "কোম্পানিটি মুনাফা করতে হিমশিম খাচ্ছে। এখন কেনা মানে ব্যবসার উন্নতির আশা করা।"]),
  ],
  p2_health: [
    row("p2_health", "strong",
      ["Strong finances", "Low debt and enough cash.", "The company owes little and earns enough cash to run smoothly, even in a difficult year."],
      ["আর্থিক অবস্থা মজবুত", "ঋণ কম, নগদ টাকা যথেষ্ট।", "কোম্পানির ঋণ কম, আর কঠিন বছরেও স্বাভাবিকভাবে চলার মতো নগদ আয় করে।"]),
    row("p2_health", "fair",
      ["Fair finances", "Debt and cash are acceptable.", "The company can pay its bills, but it has little room to spare if business slows down."],
      ["আর্থিক অবস্থা মোটামুটি", "ঋণ আর নগদ গ্রহণযোগ্য।", "কোম্পানি তার খরচ মেটাতে পারে, তবে ব্যবসা কমে গেলে হাতে বাড়তি জায়গা কম।"]),
    row("p2_health", "weak",
      ["Weak finances", "Too much debt or too little cash.", "High debt or low cash can make the company fragile, especially when the market falls."],
      ["আর্থিক অবস্থা দুর্বল", "ঋণ বেশি, বা নগদ টাকা কম।", "বেশি ঋণ বা কম নগদ কোম্পানিকে নাজুক করে তুলতে পারে, বিশেষ করে বাজার পড়লে।"]),
  ],
  p3_moat: [
    row("p3_moat", "strong",
      ["Strong business", "It holds a strong place in its industry.", "Rivals find it hard to win its customers. A good profit margin and steady sales show real strength."],
      ["শক্তিশালী ব্যবসা", "নিজের সেক্টরে শক্ত অবস্থানে আছে।", "প্রতিযোগীরা সহজে এর ক্রেতা টানতে পারে না। ভালো মুনাফার হার আর স্থির বিক্রি এর আসল শক্তি দেখায়।"]),
    row("p3_moat", "fair",
      ["Average business", "It is doing fine, but it is not the leader.", "It faces normal competition. Profit and sales are acceptable, with nothing that stands out."],
      ["মাঝারি ব্যবসা", "ভালোই চলছে, তবে শীর্ষে নেই।", "স্বাভাবিক প্রতিযোগিতার মধ্যে আছে। মুনাফা আর বিক্রি চলনসই, বিশেষ কিছু নয়।"]),
    row("p3_moat", "weak",
      ["Weak business", "Many rivals and a thin profit.", "A small profit margin, uneven sales and many rivals. It can be hurt quickly when its industry has trouble."],
      ["দুর্বল ব্যবসা", "প্রতিযোগী অনেক, মুনাফা সামান্য।", "মুনাফার হার কম, বিক্রি অসমান, প্রতিযোগী অনেক। সেক্টরে সমস্যা হলে দ্রুত ক্ষতিগ্রস্ত হতে পারে।"]),
  ],
  p4_val: [
    row("p4_val", "strong",
      ["Low price", "It costs less than usual today.", "The market is asking less for this share than it has in past years. This may be a chance to buy a good company at a lower price."],
      ["দাম কম", "আজ স্বাভাবিকের চেয়ে কম দামে পাওয়া যাচ্ছে।", "আগের বছরগুলোর তুলনায় বাজার এখন এই শেয়ারের দাম কম চাইছে। ভালো কোম্পানি কম দামে কেনার সুযোগ হতে পারে।"]),
    row("p4_val", "fair",
      ["Fair price", "It costs about what it usually does.", "The price is neither low nor high. It is close to its usual level."],
      ["ন্যায্য দাম", "দাম মোটামুটি স্বাভাবিক।", "দাম কমও নয়, বেশিও নয়। নিজের স্বাভাবিক দামের কাছাকাছি আছে।"]),
    row("p4_val", "weak",
      ["High price", "It costs more than usual today.", "You would pay more than usual right now. Waiting for a lower price is the safer choice, unless you expect fast growth."],
      ["দাম বেশি", "আজ স্বাভাবিকের চেয়ে বেশি দাম।", "এখন কিনলে স্বাভাবিকের চেয়ে বেশি দাম দিতে হবে। দ্রুত প্রবৃদ্ধির আশা না থাকলে কম দামের জন্য অপেক্ষা করাই নিরাপদ।"]),
  ],
  p5_div: [
    row("p5_div", "strong",
      ["Strong dividend", "It pays a good cash dividend every year.", "It shares its profit in cash every year, and the amount has been growing. This suits investors who want a steady income."],
      ["ভালো ডিভিডেন্ড", "প্রতি বছর ভালো নগদ ডিভিডেন্ড দেয়।", "প্রতি বছর মুনাফা থেকে নগদ টাকা দেয়, আর অঙ্কটা বাড়ছে। নিয়মিত আয় চাইলে এটি উপযোগী।"]),
    row("p5_div", "fair",
      ["Some dividend", "It pays cash in some years, not every year.", "It pays in some years and skips others. You may receive some cash, but not every year."],
      ["কিছু ডিভিডেন্ড", "কোনো কোনো বছর নগদ দেয়, প্রতি বছর নয়।", "কিছু বছর দেয়, কিছু বছর দেয় না। কিছু নগদ পেতে পারেন, তবে প্রতি বছর নিশ্চিত নয়।"]),
    row("p5_div", "weak",
      ["Low dividend", "It rarely pays cash to shareholders.", "It has paid little or no cash dividend. It is not a good fit if you want a regular income."],
      ["কম ডিভিডেন্ড", "শেয়ারহোল্ডারদের খুব কমই নগদ দেয়।", "নগদ ডিভিডেন্ড খুব কম বা একেবারেই দেয়নি। নিয়মিত আয় চাইলে এটি উপযুক্ত নয়।"]),
  ],
};

export function pillarHealthCheck(pillarKey: string, score: number | null): HealthCheckRow | null {
  if (score == null) return null;
  const triplet = PILLAR_PHRASES[pillarKey];
  if (!triplet) return null;
  if (score >= 7) return triplet[0];
  if (score >= 4) return triplet[1];
  return triplet[2];
}

export const HEALTH_PILLAR_ORDER = ["p1_biz", "p2_health", "p3_moat", "p4_val", "p5_div"];

// ---------------------------------------------------------------------------
// Profit, EPS and dividend captions
// ---------------------------------------------------------------------------

// Profit captions count the same 5-year window as the "Made a profit every year
// for N years" sign (backend stock_facts.profit_years) so the two never disagree.
const PROFIT_WINDOW = 5;

export function profitTrendCaption(profits: (number | null)[]): Bi | null {
  const valid = profits.filter((p): p is number => p != null).slice(-PROFIT_WINDOW);
  if (valid.length < 2) return null;
  const positive = valid.filter((p) => p > 0).length;
  const total = valid.length;
  const last = valid[valid.length - 1];
  const first = valid[0];

  if (positive === total && total >= 3) {
    return { en: `It made a profit in each of the last ${total} years.`, bn: `গত ${total} বছরের প্রতিটিতে মুনাফা করেছে।` };
  }
  if (positive >= Math.max(3, total - 1)) {
    return { en: `It made a profit in ${positive} of the last ${total} years.`, bn: `গত ${total} বছরের ${positive} বছর মুনাফা করেছে।` };
  }
  if (last < 0) return { en: "It made a loss in the most recent year.", bn: "সর্বশেষ বছরে লোকসান করেছে।" };
  if (first > 0 && last > first * 1.2) return { en: "Profit has been rising over time.", bn: "সময়ের সঙ্গে মুনাফা বাড়ছে।" };
  if (first > 0 && last < first * 0.8) return { en: "Profit has been falling over time.", bn: "সময়ের সঙ্গে মুনাফা কমছে।" };
  return { en: "Profit has gone up and down over the years.", bn: "বছর বছর মুনাফা ওঠানামা করেছে।" };
}

export function epsCaption(epsValues: (number | null)[]): Bi | null {
  const valid = epsValues.filter((v): v is number => v != null).slice(-PROFIT_WINDOW);
  if (!valid.length) return null;
  const latest = valid[valid.length - 1];
  const total = valid.length;
  const positive = valid.filter((v) => v > 0).length;
  const amt = `৳${Math.abs(latest).toFixed(1)}`;
  if (latest < 0) {
    return { en: `Each share made a loss of ${amt} in the latest year.`, bn: `সর্বশেষ বছরে শেয়ারপ্রতি ${amt} লোকসান হয়েছে।` };
  }
  if (positive === total && total >= 3 && valid[0] > 0 && latest > valid[0] * 1.2) {
    return { en: `Earnings per share have been growing. The latest is ${amt}.`, bn: `ইপিএস বাড়ছে। সর্বশেষ ইপিএস ${amt}।` };
  }
  if (positive === total && total >= 3) {
    return { en: `Each share has earned a profit in every one of the last ${total} years.`, bn: `গত ${total} বছরের প্রতিটিতে শেয়ারপ্রতি মুনাফা হয়েছে।` };
  }
  return { en: `Each share earned ${amt} in the latest year.`, bn: `সর্বশেষ বছরে ইপিএস ছিল ${amt}।` };
}

export function dividendStreakCaption(cashPcts: number[]): Bi | null {
  if (!cashPcts.length) return null;
  let streak = 0;
  for (let i = cashPcts.length - 1; i >= 0; i--) {
    if (cashPcts[i] > 0) streak++;
    else break;
  }
  if (streak === 0) return { en: "It paid no cash dividend in the most recent year.", bn: "সর্বশেষ বছরে কোনো নগদ ডিভিডেন্ড দেয়নি।" };
  if (streak === 1) return { en: "It paid a cash dividend last year.", bn: "গত বছর নগদ ডিভিডেন্ড দিয়েছে।" };
  return { en: `It has paid a cash dividend for ${streak} years in a row.`, bn: `টানা ${streak} বছর নগদ ডিভিডেন্ড দিয়েছে।` };
}

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

export function ownershipCaption(sponsorPct: number | null): Bi | null {
  if (sponsorPct == null) return null;
  const r = Math.round(sponsorPct);
  if (sponsorPct >= 50) {
    return {
      en: `Sponsors and directors own ${r}% of the shares. Much of their own money depends on the company doing well.`,
      bn: `উদ্যোক্তা-পরিচালকদের হাতে ${r}% শেয়ার। কোম্পানির সাফল্যের ওপর তাঁদের নিজের অনেক টাকা নির্ভর করছে।`,
    };
  }
  if (sponsorPct >= 30) {
    return {
      en: `Sponsors and directors own ${r}% of the shares, a healthy stake in their own company.`,
      bn: `উদ্যোক্তা-পরিচালকদের হাতে ${r}% শেয়ার, নিজেদের কোম্পানিতে এটি ভালো অংশ।`,
    };
  }
  if (sponsorPct >= 20) {
    return {
      en: `Sponsors and directors own ${r}% of the shares. This is on the low side.`,
      bn: `উদ্যোক্তা-পরিচালকদের হাতে ${r}% শেয়ার। এটি তুলনামূলক কম।`,
    };
  }
  return {
    en: `Sponsors and directors own only ${r}% of the shares, so little of their own money is at stake.`,
    bn: `উদ্যোক্তা-পরিচালকদের হাতে মাত্র ${r}% শেয়ার, অর্থাৎ কোম্পানিতে তাঁদের নিজের টাকা কম খাটছে।`,
  };
}

export interface OwnershipChange {
  caption: Bi;
  tone: "positive" | "watch" | "neutral";
}

/** Plain read of the biggest insider/institution move between two
 *  shareholding snapshots. Returns null when nothing moved meaningfully.
 *  (The backend's services/stock_facts.py is the primary source; this is the
 *  fallback.) `since` = the earlier report's date in each language. */
export function ownershipChangeInfo(
  current: Record<string, unknown> | null,
  previous: Record<string, unknown> | null,
  since: Bi | null,
): OwnershipChange | null {
  if (!current || !previous) return null;
  const val = (rec: Record<string, unknown>, key: string): number | null => {
    const n = Number(rec[key]);
    return Number.isFinite(n) ? n : null;
  };

  const groups: { key: string; who: Bi; sponsors: boolean }[] = [
    { key: "sponsor_director_pct", who: { en: "Sponsors and directors", bn: "উদ্যোক্তা-পরিচালকরা" }, sponsors: true },
    { key: "institute_pct", who: { en: "Institutions", bn: "প্রতিষ্ঠানগুলো" }, sponsors: false },
    { key: "foreign_pct", who: { en: "Foreign investors", bn: "বিদেশি বিনিয়োগকারীরা" }, sponsors: false },
  ];

  let best: { who: Bi; from: number; to: number; delta: number; sponsors: boolean } | null = null;
  for (const g of groups) {
    const to = val(current, g.key);
    const from = val(previous, g.key);
    if (to == null || from == null) continue;
    const delta = to - from;
    if (Math.abs(delta) < 0.5) continue;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { who: g.who, from, to, delta, sponsors: g.sponsors };
  }
  if (!best) return null;

  const sinceEn = since ? ` since ${since.en}` : " since the last report";
  const sinceBn = since ? `${since.bn}-এর পর থেকে` : "আগের প্রতিবেদনের পর থেকে";
  const f = best.from.toFixed(1);
  const t = best.to.toFixed(1);

  if (best.delta > 0) {
    return {
      tone: "positive",
      caption: {
        en: `${best.who.en} raised their holding from ${f}% to ${t}%${sinceEn}.${best.sponsors ? " People who run the company are buying more of it, which is a good sign." : ""}`,
        bn: `${sinceBn} ${best.who.bn} তাঁদের অংশ ${f}% থেকে বাড়িয়ে ${t}% করেছেন।${best.sponsors ? " কোম্পানি যাঁরা চালান তাঁরাই আরও কিনছেন, যা ভালো লক্ষণ।" : ""}`,
      },
    };
  }
  return {
    tone: "watch",
    caption: {
      en: `${best.who.en} lowered their holding from ${f}% to ${t}%${sinceEn}. It is worth finding out why.`,
      bn: `${sinceBn} ${best.who.bn} তাঁদের অংশ ${f}% থেকে কমিয়ে ${t}% করেছেন। কেন কমালেন, তা জেনে নেওয়া ভালো।`,
    },
  };
}

// ---------------------------------------------------------------------------
// Momentum (7-day) — one plain word + one supporting sentence
// ---------------------------------------------------------------------------

export type MomentumTone = "positive" | "watch" | "negative" | "neutral";

export interface MomentumSummary {
  word: Bi;
  tone: MomentumTone;
  line: Bi;
}

/** "The overall market", not "DSEX". */
export function momentumSummary(m: MomentumSnapshot): MomentumSummary | null {
  const grade = m.momentum_grade;
  if (!grade || grade === "unknown") return null;

  const WORDS: Record<string, { word: Bi; tone: MomentumTone }> = {
    hot: { word: { en: "Rising fast", bn: "দ্রুত বাড়ছে" }, tone: "positive" },
    warm: { word: { en: "Rising", bn: "বাড়ছে" }, tone: "positive" },
    flat: { word: { en: "Steady", bn: "স্থির" }, tone: "neutral" },
    cold: { word: { en: "Falling", bn: "কমছে" }, tone: "negative" },
    weak_liquidity: { word: { en: "Rarely traded", bn: "লেনদেন কম" }, tone: "watch" },
  };
  const meta = WORDS[grade] ?? WORDS.flat;

  if (grade === "weak_liquidity") {
    return {
      ...meta,
      line: {
        en: "Too few shares change hands to read a trend. The price can move sharply.",
        bn: "লেনদেন এত কম যে দামের ধারা বোঝা যায় না। দাম হঠাৎ বেশি ওঠানামা করতে পারে।",
      },
    };
  }

  const en: string[] = [];
  const bn: string[] = [];
  const r7 = m.return_7d_pct;
  if (r7 != null) {
    const p = Math.abs(r7).toFixed(1);
    en.push(`The price ${r7 >= 0 ? "rose" : "fell"} ${p}% in the past week`);
    bn.push(`গত এক সপ্তাহে দাম ${p}% ${r7 >= 0 ? "বেড়েছে" : "কমেছে"}`);
  }
  const rs = m.rs_vs_dsex_pct;
  if (rs != null && Math.abs(rs) >= 0.5) {
    en.push(rs > 0 ? "doing better than the overall market" : "doing worse than the overall market");
    bn.push(rs > 0 ? "পুরো বাজারের চেয়ে ভালো করছে" : "পুরো বাজারের চেয়ে পিছিয়ে আছে");
  }
  const vr = m.volume_ratio;
  if (vr != null && vr >= 1.3) {
    en.push("with more trading than usual");
    bn.push("লেনদেনও স্বাভাবিকের চেয়ে বেশি");
  } else if (vr != null && vr <= 0.7) {
    en.push("with less trading than usual");
    bn.push("লেনদেন স্বাভাবিকের চেয়ে কম");
  }

  if (!en.length) {
    return { ...meta, line: { en: "There is no clear short-term trend right now.", bn: "এখন স্বল্পমেয়াদে কোনো স্পষ্ট ধারা নেই।" } };
  }
  return { ...meta, line: { en: `${en.slice(0, 3).join(", ")}.`, bn: `${bn.slice(0, 3).join(", ")}।` } };
}

// ---------------------------------------------------------------------------
// Peer standing
// ---------------------------------------------------------------------------

export function peerStandingCaption(code: string, currentScore: number | null, peerScores: (number | null)[]): Bi | null {
  if (currentScore == null) return null;
  const peers = peerScores.filter((s): s is number => s != null);
  if (!peers.length) return null;
  const beaten = peers.filter((s) => currentScore >= s).length;
  if (beaten === peers.length) {
    return {
      en: `${code} scores higher than every other company in its sector shown below.`,
      bn: `নিচে দেখানো একই সেক্টরের সব কোম্পানির চেয়ে ${code}-এর স্কোর বেশি।`,
    };
  }
  if (beaten === 0) {
    return {
      en: `${code} scores lower than the other companies in its sector shown below.`,
      bn: `নিচে দেখানো একই সেক্টরের অন্য কোম্পানিগুলোর চেয়ে ${code}-এর স্কোর কম।`,
    };
  }
  return {
    en: `${code} scores higher than ${beaten} of the ${peers.length} sector companies shown below.`,
    bn: `নিচে দেখানো সেক্টরের ${peers.length}টি কোম্পানির মধ্যে ${beaten}টির চেয়ে ${code}-এর স্কোর বেশি।`,
  };
}
