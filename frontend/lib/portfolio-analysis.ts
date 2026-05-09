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
  /** Plain-language explanation of what the grade means and how it's calculated. */
  gradeExplanation: string;
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
    return {
      tag: "no_price",
      label:
        "We don't have a live price for this stock right now, so we can't tell yet whether you bought at a good price. Check back when the market reopens.",
    };
  }
  if (p4 == null) {
    return {
      tag: "no_data",
      label:
        "We don't have enough financial data on this company to judge whether the price you paid was fair. Be a bit more careful with this one until more numbers are available.",
    };
  }
  if (pnlPct >= 5) {
    if (p4 >= 7)
      return {
        tag: "great",
        label:
          "You bought at a great price, and the stock is still cheap compared to what the company earns. Hold on to this one — you got real value for your money.",
      };
    if (p4 >= 4)
      return {
        tag: "good",
        label:
          "You got a good price, and today's price is still fair. Nothing to do here — let the company keep working for you.",
      };
    return {
      tag: "up_expensive",
      label:
        "You're up nicely, but the stock now looks expensive — meaning the price has run far ahead of the company's earnings. Booking some profit now locks in your gains in case the price comes back down.",
    };
  }
  if (pnlPct >= -5) {
    if (p4 >= 7)
      return {
        tag: "fair_attractive",
        label:
          "You paid a fair price, and the stock is still cheap today. If you have spare money, this is the kind of stock to add a little more of.",
      };
    if (p4 >= 4)
      return {
        tag: "fair_fair",
        label:
          "Fair price when you bought, fair price today. No urgent action — just hold and let the business grow.",
      };
    return {
      tag: "full_price",
      label:
        "You paid full price for this stock, and it still looks fully priced. There isn't much room for the price to go higher from here, so keep your expectations modest.",
    };
  }
  if (p4 >= 7)
    return {
      tag: "down_strong",
      label:
        "The stock is down, but the company is still strong and the price is now cheaper than when you bought. If you believe in the business, buying a little more here lowers your average cost.",
    };
  if (p4 >= 4)
    return {
      tag: "down_fair",
      label:
        "You're sitting on a loss, but the price is fair now and the company is okay. Don't panic-sell — give it time to recover.",
    };
  return {
    tag: "expensive_expensive",
    label:
      "You bought when the price was already too high, and even after falling, it's still expensive compared to the company's earnings. Think hard about whether to keep holding or take the loss and move on.",
  };
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
    return "Your portfolio is well-built — your money is spread across strong companies that you bought at fair prices. Keep doing what you're doing and check back every few months.";
  }
  if (args.grade === "B") {
    if (issues.length === 0)
      return "Your portfolio is in good shape, with just a few small things to watch. No urgent changes needed — keep an eye on the points below.";
    return `Your portfolio is in good shape, but watch out for ${issues.slice(0, 2).join(" and ")}. Fix these small issues and you're on solid ground.`;
  }
  if (args.grade === "C") {
    if (issues.length === 0)
      return "Your portfolio is okay but has a few weak spots. Read the points below — small adjustments now can save you from bigger losses later.";
    return `Your portfolio is okay, but ${issues.slice(0, 2).join(" and ")} are pulling your returns down. Spreading the risk a bit more will make your money safer.`;
  }
  if (args.grade === "D") {
    return `Your portfolio is shaky — ${issues.slice(0, 2).join(" and ") || "your money is too concentrated and the mix is uneven"}. Without a rebalance, one bad stretch in the market could hurt you a lot.`;
  }
  return `Your portfolio is very risky — ${issues.slice(0, 2).join(" and ") || "it needs a serious rebalance"}. Step back, follow the actions below, and rebuild on a stronger base before adding any more money.`;
}

function composeGradeExplanation(grade: Grade): string {
  const intro =
    "We grade your portfolio on three simple things: how well you've spread your money so one bad stock doesn't sink everything, how strong the companies you own actually are, and whether you bought at a fair price. ";
  switch (grade) {
    case "A":
      return (
        intro +
        "An 'A' means all three are in good shape — this is what a healthy long-term portfolio looks like."
      );
    case "B":
      return (
        intro +
        "A 'B' means most things are working, with a few small things to watch — nothing urgent."
      );
    case "C":
      return (
        intro +
        "A 'C' means at least one of these three is weak. Fix it now while the issue is still small."
      );
    case "D":
      return (
        intro +
        "A 'D' means two of these three are weak. Don't add more money until you sort out the issues below."
      );
    case "F":
    default:
      return (
        intro +
        "An 'F' means all three are weak. This is a high-risk setup — read the action points below before doing anything else."
      );
  }
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
      `You own ${holdingCount} different stocks across ${distinctSectors} sectors — that's a healthy spread. If one sector goes through a rough patch, the others can still hold your portfolio up. This is exactly the safety net long-term investors aim for.`,
    );
  }
  if (scored.length >= 2) {
    const strongCount = scored.filter((i) => (i.score as number) >= 70).length;
    if (strongCount / scored.length >= 0.6) {
      good.push(
        `Most of the companies you own are strong picks (${strongCount} out of ${scored.length}). These are businesses with solid earnings and healthy finances — the kind of stocks that hold up better when the market gets rough.`,
      );
    }
  }
  if (best && (best.pnlPct as number) >= 20) {
    good.push(
      `${best.code} has been a great pick — it's up ${(best.pnlPct as number).toFixed(1)}% since you bought it. Don't sell just because it's up; check whether the company is still strong, and only book profit if the price has run far ahead of the business.`,
    );
  }
  if (judgeableEntryCount > 0 && goodEntryCount / judgeableEntryCount >= 0.6) {
    good.push(
      `You paid a fair price for most of your stocks (${goodEntryCount} out of ${judgeableEntryCount}). Buying at a fair price is half the battle in the stock market — you've avoided overpaying, which means a lot less stress later.`,
    );
  }
  if (reliableDividend.length >= 2) {
    good.push(
      `You earn reliable dividends from ${reliableDividend.length} of your companies. That means cash returning to you every year on top of any price gains — like rent from a property you own. Reinvesting these dividends quietly grows your portfolio over time.`,
    );
  }
  if (winRatePct != null && winRatePct >= 70 && performersWithPnl.length >= 3) {
    good.push(
      `Most of your stocks are currently in profit (${winners.length} out of ${performersWithPnl.length}). That's a sign your stock-picking is working — keep your process the same and resist the urge to sell winners too quickly.`,
    );
  }

  // Bad
  if (holdingCount === 1) {
    bad.push(
      "You only own 1 stock, which means your entire money is tied to a single company. If that one company has a bad year — weak results, a scandal, anything — your whole portfolio falls with it. Add 4–7 more stocks from different sectors as soon as you can.",
    );
  } else if (holdingCount === 2) {
    bad.push(
      "You only own 2 stocks — that's still too concentrated. A bad day for either one hits your portfolio hard, because half your money moves with each stock. Aim for at least 5 stocks across 3 different sectors.",
    );
  }
  if (maxSectorPct > 50 && distinctSectors > 1) {
    bad.push(
      `${maxSectorPct.toFixed(0)}% of your money is sitting in ${maxSectorName} stocks. If that sector has a bad quarter — interest-rate changes, regulation, weak earnings — most of your portfolio falls together. Try moving some money into a different sector to spread the risk.`,
    );
  } else if (distinctSectors === 1 && holdingCount >= 2) {
    bad.push(
      `All your stocks are in one sector (${maxSectorName}), so your portfolio rises and falls with that single industry. When that sector is in trouble, you have nothing else to balance the loss. Add stocks from at least 2 other sectors to fix this.`,
    );
  }
  if (largestPos && largestPos.weightPct > 40 && holdingCount > 1) {
    bad.push(
      `${largestPos.code} alone is ${largestPos.weightPct.toFixed(0)}% of your portfolio. If that one stock drops 20%, your whole portfolio drops nearly ${(largestPos.weightPct * 0.2).toFixed(0)}% — that's a big hit from a single company. Trim it down or grow your other positions so no one stock dominates.`,
    );
  }
  if (strugglingNames.length === 1) {
    bad.push(
      `${strugglingNames[0]}'s finances look weak — likely heavy debt or weak cash flow. Companies in this shape can struggle to pay dividends or even survive a downturn. Watch the next quarterly result closely and be ready to step out if things don't improve.`,
    );
  } else if (strugglingNames.length > 1) {
    bad.push(
      `${nameList(strugglingNames)} have weak finances — likely heavy debt or weak cash flow. Companies in this shape can struggle to pay dividends or even survive a downturn. Watch their next quarterly results closely.`,
    );
  }
  if (avoidNames.length === 1) {
    bad.push(
      `${avoidNames[0]} is rated low on overall quality, meaning weak fundamentals across the board. Holding weak companies usually leads to disappointing returns over time. Honestly ask yourself why you're holding it — and if there's no strong reason, consider switching to a better-rated stock.`,
    );
  } else if (avoidNames.length > 1) {
    bad.push(
      `${nameList(avoidNames)} are rated low on overall quality, meaning weak fundamentals across the board. Holding weak companies usually leads to disappointing returns over time. Replace them with better-rated stocks when you get the chance.`,
    );
  }
  if (shrinkingItems.length === 1) {
    const drop =
      shrinkingItems[0].epsYoy != null
        ? `${Math.abs(shrinkingItems[0].epsYoy as number).toFixed(0)}%`
        : "double digits";
    bad.push(
      `${shrinkingItems[0].code}'s earnings have dropped ${drop} from last year — the business is shrinking. When a company's profit shrinks, the share price usually follows. Watch the next quarterly result; if earnings keep falling, it may be time to step out.`,
    );
  } else if (shrinkingItems.length > 1) {
    bad.push(
      `${nameList(shrinkingItems.map((s) => s.code))} have all seen falling earnings — these businesses are shrinking. Share prices usually follow profits down over time, so don't ignore this. Watch their next quarterly results carefully and be ready to act.`,
    );
  }
  if (expensiveItems.length > 0) {
    const head = expensiveItems
      .slice(0, 2)
      .map((i) => `${i.code} (down ${Math.abs(i.pnlPct ?? 0).toFixed(1)}%)`)
      .join(", ");
    const more = expensiveItems.length > 2 ? ` and ${expensiveItems.length - 2} more` : "";
    bad.push(
      `You paid a high price for ${head}${more} — and ${expensiveItems.length === 1 ? "it" : "they"} still ${expensiveItems.length === 1 ? "looks" : "look"} expensive today. That means even after the fall, the price hasn't yet caught up to what the company actually earns. Either accept it may take a long time to recover, or take the loss and put the money into better-priced stocks.`,
    );
  }

  // Consider
  if (holdingCount < 5) {
    const need = Math.max(5 - holdingCount, 1);
    consider.push(
      `Add ${need} more stock${need === 1 ? "" : "s"} from different sectors. Owning just a couple of stocks is like putting all your savings into one shop — if that shop has a bad year, you have nothing else to fall back on. Aim for 5–8 stocks across at least 3 sectors so no single company or industry can hurt you too much.`,
    );
  }
  if (maxSectorPct > 50 && holdingCount > 1) {
    consider.push(
      `Trim your ${maxSectorName} exposure — it's currently ${maxSectorPct.toFixed(0)}% of your portfolio. The simplest fix is to stop adding to it and direct your next investments into a different sector. Over time the balance will even out without you having to sell anything.`,
    );
  }
  const averageDownCandidates = insights.filter((i) => i.entryTag === "down_strong");
  if (averageDownCandidates.length > 0) {
    const c = averageDownCandidates[0];
    consider.push(
      `${c.code} is down, but the company is still strong and the price is now cheaper than when you bought. If you have spare money and still believe in the business, buying a little more here lowers your average cost — so when it recovers, you make back the loss faster.`,
    );
  }
  const sellCandidates = insights.filter(
    (i) => i.tierKey === "avoid" && i.entryTag === "expensive_expensive",
  );
  if (sellCandidates.length > 0) {
    consider.push(
      `Consider selling or reducing ${nameList(sellCandidates.map((s) => s.code))} — both the company quality and the price look weak. Holding a weak company at an expensive price is the worst combination, because you may keep waiting for a recovery that never comes. Take the loss, learn from it, and move the money into a better stock.`,
    );
  }
  if (upExpensiveItems.length > 0) {
    const c = upExpensiveItems[0];
    consider.push(
      `${c.code} has run up sharply — the stock now looks expensive compared to what the company actually earns. Booking some profit (selling part of your position) lets you lock in your gains while still keeping some shares for further upside. You don't have to sell all of it.`,
    );
  }
  if (reliableDividend.length === 0 && holdingCount >= 3) {
    consider.push(
      "None of your stocks pay a strong, reliable dividend. Adding 1–2 good dividend stocks gives you cash returning to you every year, which feels like rent on top of any price gains. This is especially useful if you want steady income alongside long-term growth.",
    );
  }
  if (good.length === 0 && bad.length === 0 && consider.length === 0) {
    consider.push(
      "Your portfolio looks healthy and there's nothing urgent to fix. Check back once a quarter when company results come out — that's the natural time to review your holdings.",
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
  const gradeExplanation = composeGradeExplanation(grade);

  return {
    grade,
    gradeLabel,
    headline,
    gradeExplanation,
    good: good.slice(0, 5),
    bad: bad.slice(0, 5),
    consider: consider.slice(0, 5),
    holdings: insights,
    sectorSpread,
    subScores: { spread: spreadScore, quality: qualityScore, entry: entryScore, overall },
  };
}
