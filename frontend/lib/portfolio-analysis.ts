import type { ScoreItem, PortfolioHolding } from "@/lib/api";
import { getTier, type TierKey } from "@/lib/constants";

export interface ComputedRow {
  holding: PortfolioHolding;
  ltp: number | null;
  company_name: string | null;
  cost_basis: number;
  current_value: number | null;
  pnl: number | null;
  pnl_pct: number | null;
}

export type SectorBucket = "BANK" | "NBFI" | "GENERAL" | "OTHER";
export type TierBucket = TierKey | "unscored";
export type QualityWord = "Strong" | "Solid" | "Average" | "Weak" | "Unrated";
export type EntryTag =
  | "great"
  | "good"
  | "up_expensive"
  | "fair_attractive"
  | "fair_fair"
  | "full_price"
  | "down_strong"
  | "down_fair"
  | "expensive_expensive"
  | "no_data"
  | "no_price";

export interface HoldingInsight {
  code: string;
  companyName: string | null;
  sector: string | null;
  sectorBucket: SectorBucket;
  weightPct: number;
  qty: number;
  buyPrice: number;
  ltp: number | null;
  pnlPct: number | null;
  score: number | null;
  tierKey: TierBucket;
  qualityWord: QualityWord;
  entryTag: EntryTag;
  entryLabel: string;
  descriptor: string;
  oneLiner: string;
  pillars: {
    p1_biz: number | null;
    p2_health: number | null;
    p3_moat: number | null;
    p4_val: number | null;
    p5_div: number | null;
  };
  flags: {
    weakFinances: boolean;
    weakEarnings: boolean;
    earningsShrinking: boolean;
    expensiveEntry: boolean;
  };
}

export type Grade = "A" | "B" | "C" | "D" | "F";
export type GradeLabel = "Excellent" | "Good" | "Okay" | "Risky" | "Very Risky";

export interface PortfolioAnalysis {
  grade: Grade;
  gradeLabel: GradeLabel;
  headline: string;
  good: string[];
  bad: string[];
  consider: string[];
  holdings: HoldingInsight[];
  sectorSpread: { name: string; weightPct: number; count: number }[];
  subScores: { spread: number; quality: number; entry: number; overall: number };
}

// ── helpers ────────────────────────────────────────────────────────────────

function sectorBucketOf(sector: string | null): SectorBucket {
  if (!sector) return "OTHER";
  const s = sector.toLowerCase();
  if (/non-bank|nbfi|leasing|finance/.test(s)) return "NBFI";
  if (s.includes("bank")) return "BANK";
  return "GENERAL";
}

function tierBucket(score: number | null | undefined): TierBucket {
  if (score == null) return "unscored";
  return getTier(score);
}

const QUALITY_WORD: Record<TierBucket, QualityWord> = {
  strong_buy: "Strong",
  buy: "Solid",
  keep_watching: "Average",
  avoid: "Weak",
  unscored: "Unrated",
};

function classifyEntry(
  pnlPct: number | null,
  p4: number | null | undefined,
): { tag: EntryTag; label: string } {
  if (pnlPct == null) {
    return { tag: "no_price", label: "Live price unavailable — can't judge the entry yet." };
  }
  if (p4 == null) {
    return { tag: "no_data", label: "Not enough data to judge the price you paid." };
  }
  if (pnlPct >= 5) {
    if (p4 >= 7) return { tag: "great", label: "You bought at a great price — and it's still a good deal today." };
    if (p4 >= 4) return { tag: "good", label: "You got a good price — current price is fair." };
    return { tag: "up_expensive", label: "You're up, but the stock now looks expensive — consider booking some profit." };
  }
  if (pnlPct >= -5) {
    if (p4 >= 7) return { tag: "fair_attractive", label: "Your entry was fair — the stock is still attractively priced." };
    if (p4 >= 4) return { tag: "fair_fair", label: "Fair price, fair entry." };
    return { tag: "full_price", label: "You paid full price — there's not much room for the stock to go higher." };
  }
  if (p4 >= 7) return { tag: "down_strong", label: "Stock is down, but it's still a strong buy at today's price — could be a chance to average down." };
  if (p4 >= 4) return { tag: "down_fair", label: "You're down — wait it out, the price is fair now." };
  return { tag: "expensive_expensive", label: "You bought when it was expensive — and it still looks expensive. Reconsider holding." };
}

const ENTRY_SHORT: Record<EntryTag, string> = {
  great: "great price",
  good: "good price",
  up_expensive: "now overpriced",
  fair_attractive: "fair price",
  fair_fair: "fair price",
  full_price: "full price",
  down_strong: "still cheap",
  down_fair: "fair price",
  expensive_expensive: "paid too much",
  no_data: "price unclear",
  no_price: "no live price",
};

function shortPnl(pnlPct: number | null): string {
  if (pnlPct == null) return "no live price";
  const abs = Math.abs(pnlPct);
  if (pnlPct >= 0.5) return `up ${abs.toFixed(1)}%`;
  if (pnlPct <= -0.5) return `down ${abs.toFixed(1)}%`;
  return "flat";
}

function nameList(names: string[], cap = 2): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length <= cap + 1) {
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }
  return `${names.slice(0, cap).join(", ")} and ${names.length - cap} more`;
}

function isLow(v: number | null | undefined, threshold: number): boolean {
  return v != null && v < threshold;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function gradeFromAvg(avg: number): { grade: Grade; label: GradeLabel } {
  if (avg >= 8) return { grade: "A", label: "Excellent" };
  if (avg >= 6.5) return { grade: "B", label: "Good" };
  if (avg >= 5) return { grade: "C", label: "Okay" };
  if (avg >= 3.5) return { grade: "D", label: "Risky" };
  return { grade: "F", label: "Very Risky" };
}

function buildDescriptor(insight: HoldingInsight): string {
  if (insight.tierKey === "unscored") return "Not enough data yet.";
  if (insight.entryTag === "no_price") return `${insight.qualityWord} company, no live price yet.`;
  const entryShort = ENTRY_SHORT[insight.entryTag];
  const pnl = shortPnl(insight.pnlPct);
  return `${insight.qualityWord} company, ${entryShort}, ${pnl}.`;
}

function buildOneLiner(insight: HoldingInsight): string {
  const sectorPart = insight.sector ?? "Unknown sector";
  const weightStr = `${insight.weightPct.toFixed(0)}%`;
  return `${insight.code} — ${sectorPart} · ${weightStr} · ${insight.descriptor}`;
}

function composeHeadline(args: {
  grade: Grade;
  holdingCount: number;
  maxSectorPct: number;
  maxSectorName: string;
  strugglingCount: number;
  avoidCount: number;
  expensiveCount: number;
}): string {
  const issues: string[] = [];
  if (args.holdingCount === 1) issues.push("everything is in one stock");
  else if (args.holdingCount === 2) issues.push("only two stocks");
  if (args.maxSectorPct > 50 && args.holdingCount > 1) {
    issues.push(`${args.maxSectorPct.toFixed(0)}% is in ${args.maxSectorName}`);
  }
  if (args.strugglingCount > 0) {
    issues.push(`${args.strugglingCount} financially weak compan${args.strugglingCount === 1 ? "y" : "ies"}`);
  }
  if (args.avoidCount > 0) {
    issues.push(`${args.avoidCount} low-quality holding${args.avoidCount === 1 ? "" : "s"}`);
  }
  if (args.expensiveCount > 0) {
    issues.push(`${args.expensiveCount} stock${args.expensiveCount === 1 ? "" : "s"} bought too expensive`);
  }

  if (args.grade === "A") {
    return "Your portfolio is well-built — good spread, strong companies, and fair entry prices.";
  }
  if (args.grade === "B") {
    if (issues.length === 0) return "Your portfolio is in good shape, with minor things to watch.";
    return `Your portfolio is in good shape — but watch out for ${issues.slice(0, 2).join(" and ")}.`;
  }
  if (args.grade === "C") {
    if (issues.length === 0) return "Your portfolio is okay but has a few weak spots.";
    return `Your portfolio is okay, but ${issues.slice(0, 2).join(" and ")} are dragging it down.`;
  }
  if (args.grade === "D") {
    return `Your portfolio is shaky — ${issues.slice(0, 2).join(" and ") || "concentrated and uneven"}.`;
  }
  return `Your portfolio is very risky — ${issues.slice(0, 2).join(" and ") || "needs a serious rebalance"}.`;
}

// ── main ───────────────────────────────────────────────────────────────────

export function analyzePortfolio(
  rows: ComputedRow[],
  priceMap: Map<string, ScoreItem>,
): PortfolioAnalysis {
  const weightBasisOf = (r: ComputedRow): number => r.current_value ?? r.cost_basis;
  const totalBasis = rows.reduce((acc, r) => acc + weightBasisOf(r), 0) || 1;

  const insights: HoldingInsight[] = rows.map((row) => {
    const code = row.holding.trading_code;
    const item = priceMap.get(code);
    const score = item?.score ?? null;
    const tk = tierBucket(score);
    const entry = classifyEntry(row.pnl_pct, item?.p4_val);
    const weightPct = (weightBasisOf(row) / totalBasis) * 100;
    const flags = {
      weakFinances: isLow(item?.p2_health, 4),
      weakEarnings: isLow(item?.p1_biz, 4),
      earningsShrinking: isLow(item?.eps_yoy_pct, -10),
      expensiveEntry:
        entry.tag === "expensive_expensive" ||
        entry.tag === "up_expensive" ||
        entry.tag === "full_price",
    };
    const insight: HoldingInsight = {
      code,
      companyName: row.company_name ?? item?.company_name ?? null,
      sector: item?.sector ?? null,
      sectorBucket: sectorBucketOf(item?.sector ?? null),
      weightPct,
      qty: row.holding.qty,
      buyPrice: row.holding.buy_price,
      ltp: row.ltp,
      pnlPct: row.pnl_pct,
      score,
      tierKey: tk,
      qualityWord: QUALITY_WORD[tk],
      entryTag: entry.tag,
      entryLabel: entry.label,
      descriptor: "",
      oneLiner: "",
      pillars: {
        p1_biz: item?.p1_biz ?? null,
        p2_health: item?.p2_health ?? null,
        p3_moat: item?.p3_moat ?? null,
        p4_val: item?.p4_val ?? null,
        p5_div: item?.p5_div ?? null,
      },
      flags,
    };
    insight.descriptor = buildDescriptor(insight);
    insight.oneLiner = buildOneLiner(insight);
    return insight;
  });

  // Sector spread
  const sectorMap = new Map<string, { weight: number; count: number }>();
  for (const ins of insights) {
    const key = ins.sector ?? "Other";
    const cur = sectorMap.get(key) ?? { weight: 0, count: 0 };
    cur.weight += ins.weightPct;
    cur.count += 1;
    sectorMap.set(key, cur);
  }
  const sectorSpread = Array.from(sectorMap.entries())
    .map(([name, v]) => ({ name, weightPct: v.weight, count: v.count }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const distinctSectors = sectorSpread.length;
  const maxSector = sectorSpread[0];
  const maxSectorPct = maxSector?.weightPct ?? 0;
  const maxSectorName = maxSector?.name ?? "";

  // Aggregates
  const holdingCount = insights.length;
  const scored = insights.filter((i) => i.score != null);
  const totalScoredWeight = scored.reduce((acc, i) => acc + i.weightPct, 0) || 1;
  const weightedAvgScore =
    scored.length > 0
      ? scored.reduce((acc, i) => acc + (i.score as number) * i.weightPct, 0) / totalScoredWeight
      : null;

  const avoidNames = insights.filter((i) => i.tierKey === "avoid").map((i) => i.code);
  const strugglingNames = insights.filter((i) => i.flags.weakFinances).map((i) => i.code);
  const shrinkingItems = insights
    .filter((i) => i.flags.earningsShrinking)
    .map((i) => ({ code: i.code, epsYoy: priceMap.get(i.code)?.eps_yoy_pct ?? null }));
  const reliableDividend = insights.filter((i) => (priceMap.get(i.code)?.p5_div ?? 0) >= 7);

  const expensiveItems = insights.filter((i) => i.entryTag === "expensive_expensive");
  const upExpensiveItems = insights.filter((i) => i.entryTag === "up_expensive");
  const fullPriceItems = insights.filter((i) => i.entryTag === "full_price");
  const goodEntryCount = insights.filter((i) =>
    ["great", "good", "fair_attractive", "fair_fair", "down_strong", "down_fair"].includes(i.entryTag),
  ).length;
  const judgeableEntryCount = insights.filter(
    (i) => i.entryTag !== "no_data" && i.entryTag !== "no_price",
  ).length;

  const performersWithPnl = insights.filter((i) => i.pnlPct != null);
  const winners = performersWithPnl.filter((i) => (i.pnlPct as number) > 0);
  const winRatePct =
    performersWithPnl.length > 0 ? (winners.length / performersWithPnl.length) * 100 : null;
  const best =
    performersWithPnl.length > 0
      ? [...performersWithPnl].sort((a, b) => (b.pnlPct as number) - (a.pnlPct as number))[0]
      : null;

  const sortedByWeight = [...insights].sort((a, b) => b.weightPct - a.weightPct);
  const largestPos = sortedByWeight[0];

  // ── Bullets ────────────────────────────────────────────────────────────
  const good: string[] = [];
  const bad: string[] = [];
  const consider: string[] = [];

  // Good
  if (holdingCount >= 5 && distinctSectors >= 3) {
    good.push(
      `You own ${holdingCount} different stocks across ${distinctSectors} sectors — that's a healthy spread.`,
    );
  }
  if (scored.length >= 2) {
    const strongCount = scored.filter((i) => (i.score as number) >= 70).length;
    if (strongCount / scored.length >= 0.6) {
      good.push(
        `Most of the companies you own are strong picks (${strongCount} out of ${scored.length}).`,
      );
    }
  }
  if (best && (best.pnlPct as number) >= 20) {
    good.push(
      `${best.code} was a great pick — up ${(best.pnlPct as number).toFixed(1)}% since you bought it.`,
    );
  }
  if (judgeableEntryCount > 0 && goodEntryCount / judgeableEntryCount >= 0.6) {
    good.push(
      `You paid a fair price for most of your stocks (${goodEntryCount} out of ${judgeableEntryCount}).`,
    );
  }
  if (reliableDividend.length >= 2) {
    good.push(
      `You earn reliable dividends from ${reliableDividend.length} of your companies.`,
    );
  }
  if (winRatePct != null && winRatePct >= 70 && performersWithPnl.length >= 3) {
    good.push(
      `Most of your stocks are in profit (${winners.length} out of ${performersWithPnl.length}).`,
    );
  }

  // Bad
  if (holdingCount === 1) {
    bad.push("You only own 1 stock — putting everything in one company is very risky.");
  } else if (holdingCount === 2) {
    bad.push(
      "You only own 2 stocks — that's too concentrated. A bad day for either one hits your portfolio hard.",
    );
  }
  if (maxSectorPct > 50 && distinctSectors > 1) {
    bad.push(
      `${maxSectorPct.toFixed(0)}% of your money is in ${maxSectorName} — if that sector struggles, your whole portfolio takes a hit.`,
    );
  } else if (distinctSectors === 1 && holdingCount >= 2) {
    bad.push(
      `All your stocks are in one sector (${maxSectorName}) — your portfolio rises and falls with that one industry.`,
    );
  }
  if (largestPos && largestPos.weightPct > 40 && holdingCount > 1) {
    bad.push(
      `${largestPos.code} alone is ${largestPos.weightPct.toFixed(0)}% of your portfolio — if it drops, your portfolio takes a big hit.`,
    );
  }
  if (strugglingNames.length === 1) {
    bad.push(
      `${strugglingNames[0]}'s finances look weak — heavy debt or weak cash flow. Watch closely.`,
    );
  } else if (strugglingNames.length > 1) {
    bad.push(
      `${nameList(strugglingNames)} have weak finances — heavy debt or weak cash flow. Watch closely.`,
    );
  }
  if (avoidNames.length === 1) {
    bad.push(
      `${avoidNames[0]} is rated low on overall quality — consider whether you still want to hold it.`,
    );
  } else if (avoidNames.length > 1) {
    bad.push(
      `${nameList(avoidNames)} are rated low on overall quality — consider whether you still want to hold them.`,
    );
  }
  if (shrinkingItems.length === 1) {
    const drop = shrinkingItems[0].epsYoy != null
      ? `${Math.abs(shrinkingItems[0].epsYoy as number).toFixed(0)}% drop`
      : "double-digit drops";
    bad.push(
      `${shrinkingItems[0].code}'s earnings have been falling (${drop}) — the business is shrinking.`,
    );
  } else if (shrinkingItems.length > 1) {
    bad.push(
      `${nameList(shrinkingItems.map((s) => s.code))} have all seen falling earnings — these businesses are shrinking.`,
    );
  }
  if (expensiveItems.length > 0) {
    const head = expensiveItems
      .slice(0, 2)
      .map((i) => `${i.code} (down ${Math.abs(i.pnlPct ?? 0).toFixed(1)}%)`)
      .join(", ");
    const more = expensiveItems.length > 2 ? ` and ${expensiveItems.length - 2} more` : "";
    bad.push(
      `You paid a high price for ${head}${more} — and ${expensiveItems.length === 1 ? "it" : "they"} still ${expensiveItems.length === 1 ? "looks" : "look"} expensive today.`,
    );
  }

  // Consider
  if (holdingCount < 5) {
    const need = Math.max(5 - holdingCount, 1);
    consider.push(
      `Add ${need} more stock${need === 1 ? "" : "s"} from different sectors to spread your risk.`,
    );
  }
  if (maxSectorPct > 50 && holdingCount > 1) {
    consider.push(
      `Trim your ${maxSectorName} exposure — currently ${maxSectorPct.toFixed(0)}% of your portfolio.`,
    );
  }
  const averageDownCandidates = insights.filter((i) => i.entryTag === "down_strong");
  if (averageDownCandidates.length > 0) {
    const c = averageDownCandidates[0];
    consider.push(
      `${c.code} is down but the company is still strong — could be a chance to buy more at a lower price.`,
    );
  }
  const sellCandidates = insights.filter(
    (i) => i.tierKey === "avoid" && i.entryTag === "expensive_expensive",
  );
  if (sellCandidates.length > 0) {
    consider.push(
      `Consider selling or reducing ${nameList(sellCandidates.map((s) => s.code))} — both the price and the company quality are weak.`,
    );
  }
  if (upExpensiveItems.length > 0) {
    const c = upExpensiveItems[0];
    consider.push(
      `${c.code} has run up — the stock now looks expensive, so consider booking some profit.`,
    );
  }
  if (reliableDividend.length === 0 && holdingCount >= 3) {
    consider.push(
      "Look at strong dividend-paying stocks if you want regular income alongside growth.",
    );
  }
  if (good.length === 0 && bad.length === 0 && consider.length === 0) {
    consider.push(
      "Your portfolio looks healthy. Check back once a quarter — no urgent action needed.",
    );
  }

  // ── Grade ──────────────────────────────────────────────────────────────
  let sectorPenalty = 0;
  if (distinctSectors === 1 && holdingCount >= 1) sectorPenalty = Math.max(sectorPenalty, 2);
  if (maxSectorPct > 50) sectorPenalty = Math.max(sectorPenalty, 4);
  const spreadScore = clamp(Math.min(holdingCount, 10) - sectorPenalty, 0, 10);

  const baseQuality = weightedAvgScore != null ? weightedAvgScore / 10 : 5;
  const qualityScore = clamp(
    baseQuality - 2 * avoidNames.length - 1 * strugglingNames.length,
    0,
    10,
  );

  const expensivePenalty =
    2 * (expensiveItems.length + upExpensiveItems.length) + 1 * fullPriceItems.length;
  const entryScore = clamp(10 - expensivePenalty, 0, 10);

  const overall = (spreadScore + qualityScore + entryScore) / 3;
  const { grade, label: gradeLabel } = gradeFromAvg(overall);

  const headline = composeHeadline({
    grade,
    holdingCount,
    maxSectorPct,
    maxSectorName,
    strugglingCount: strugglingNames.length,
    avoidCount: avoidNames.length,
    expensiveCount: expensiveItems.length,
  });

  return {
    grade,
    gradeLabel,
    headline,
    good: good.slice(0, 5),
    bad: bad.slice(0, 5),
    consider: consider.slice(0, 5),
    holdings: insights,
    sectorSpread,
    subScores: { spread: spreadScore, quality: qualityScore, entry: entryScore, overall },
  };
}
