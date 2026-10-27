/**
 * "Your next move" and "What would raise your grade" (2026-10-26) — two reads
 * on top of `analyzePortfolio` + `buildRebalancePlan`, so they can never
 * disagree with the grade, the lists or the buy ideas on the same page.
 *
 * - `buildNextMove` ranks every open issue by the taka at stake and returns
 *   the one to act on first (plus up to two more). It names only what is
 *   already free on the page: stocks marked Sell (their cards show it) and the
 *   biggest stock (the allocation chart shows it). Weak holdings are a count.
 * - `gradeLifts` re-runs the same grade on a copy of the portfolio after one
 *   change (buy the first idea · sell what is marked Sell · trim the biggest
 *   stock · swap a weak holding) and keeps the changes that raise it.
 *
 * Bilingual like the analysis: numbers stay Western in Bengali prose.
 */
import type { ScoreItem } from "@/lib/api";
import { takaGroup } from "@/lib/formatters";
import {
  analyzePortfolio,
  type AnalysisLang,
  type ComputedRow,
  type Grade,
  type HoldingInsight,
  type PortfolioAnalysis,
  type RebalancePlan,
} from "@/lib/portfolio-analysis";

/** A stock larger than this share of the money is "carrying too much". */
export const MAX_STOCK_PCT = 25;
/** A sector above this share is too heavy; the fix brings it back to 40%. */
const MAX_SECTOR_PCT = 50;
const SECTOR_TARGET_PCT = 40;

export type NextMoveKind = "sell" | "weak" | "stock" | "sector" | "few" | "dividend" | "none";

export interface NextMove {
  kind: NextMoveKind;
  title: string;
  line: string;
  /** Taka at stake (what the move is about), or null for "nothing urgent". */
  amount: number | null;
  /** Where the reader goes to act on it. */
  href: string | null;
  cta: string | null;
}

const valueOf = (h: HoldingInsight) => h.qty * (h.ltp ?? h.buyPrice);

function names(codes: string[], bn: boolean): string {
  if (codes.length <= 2) return codes.join(bn ? " আর " : " and ");
  return bn ? `${codes.slice(0, 2).join(", ")} আর আরও ${codes.length - 2}টি` : `${codes.slice(0, 2).join(", ")} and ${codes.length - 2} more`;
}

/** The first thing to do with this portfolio, then up to two more. */
export function buildNextMove(
  analysis: PortfolioAnalysis,
  plan: RebalancePlan | null,
  lang: AnalysisLang,
): { first: NextMove; more: NextMove[] } {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const hs = analysis.holdings;
  const total = hs.reduce((acc, h) => acc + valueOf(h), 0);
  const moves: (NextMove & { weight: number })[] = [];

  const sells = hs.filter((h) => h.signal.signal === "sell");
  if (sells.length > 0) {
    const amt = sells.reduce((acc, h) => acc + valueOf(h), 0);
    const codes = sells.map((h) => h.code);
    moves.push({
      kind: "sell",
      title:
        sells.length === 1
          ? L(`Decide on ${codes[0]}, which is marked Sell`, `${codes[0]}-এ বিক্রির সংকেত আছে, এটি নিয়ে সিদ্ধান্ত নিন`)
          : L(`Decide on your ${sells.length} stocks marked Sell`, `বিক্রির সংকেতে থাকা আপনার ${sells.length}টি শেয়ার নিয়ে সিদ্ধান্ত নিন`),
      line: L(
        `${takaGroup(amt)} sits in ${names(codes, false)}. ${sells.length === 1 ? "Its page says" : "Their pages say"} why; selling is your call.`,
        `${names(codes, true)}-এ আছে ${takaGroup(amt)}। কেন, তা শেয়ারের পেজে লেখা আছে; বিক্রি করবেন কি না, সিদ্ধান্ত আপনার।`,
      ),
      amount: amt,
      href: sells.length === 1 ? `/stock/${codes[0]}` : "#pf-holds",
      cta: sells.length === 1 ? L(`Open ${codes[0]}`, `${codes[0]} দেখুন`) : L("See your stocks", "আপনার শেয়ার দেখুন"),
      weight: amt * 1.5,
    });
  }

  const weak = hs.filter((h) => (h.tierKey === "weak" || h.flags.zCategory) && h.signal.signal !== "sell");
  if (weak.length > 0) {
    const amt = weak.reduce((acc, h) => acc + valueOf(h), 0);
    moves.push({
      kind: "weak",
      title: L("Look again at your weaker companies", "দুর্বল কোম্পানিগুলো আবার দেখুন"),
      line: L(
        `${takaGroup(amt)} is in ${weak.length} stock${weak.length === 1 ? "" : "s"} rated weak or in DSE's Z category.`,
        `${takaGroup(amt)} আছে ${weak.length}টি দুর্বল রেটিং বা Z ক্যাটাগরির শেয়ারে।`,
      ),
      amount: amt,
      href: "#portfolio-analysis",
      cta: L("See what we found", "কী পেয়েছি দেখুন"),
      weight: amt * 1.2,
    });
  }

  const biggest = [...hs].sort((a, b) => b.weightPct - a.weightPct)[0];
  if (biggest && hs.length > 1 && biggest.weightPct > MAX_STOCK_PCT + 5) {
    const excess = valueOf(biggest) - (total * MAX_STOCK_PCT) / 100;
    moves.push({
      kind: "stock",
      title: L(`${biggest.code} carries too much of your money`, `${biggest.code}-এ আপনার টাকা বেশি জমেছে`),
      line: L(
        `It is ${biggest.weightPct.toFixed(0)}% of your money. About ${takaGroup(excess)} elsewhere would bring it to ${MAX_STOCK_PCT}%. You can sell some, or put your next buys into other shares.`,
        `এটি আপনার টাকার ${biggest.weightPct.toFixed(0)}%। প্রায় ${takaGroup(excess)} অন্য জায়গায় গেলে এটি ${MAX_STOCK_PCT}%-এ নামবে। কিছু বিক্রি করতে পারেন, বা পরের কেনাগুলো অন্য শেয়ারে করতে পারেন।`,
      ),
      amount: excess,
      href: "#pf-whatif",
      cta: L("Try it in the what-if check", "যদি-এমন-করি যাচাইয়ে দেখুন"),
      weight: excess,
    });
  }

  const top = analysis.sectorSpread[0];
  if (top && analysis.sectorSpread.length > 1 && top.weightPct > MAX_SECTOR_PCT && !(biggest && biggest.sector === top.name && biggest.weightPct >= top.weightPct - 1)) {
    const excess = (total * (top.weightPct - SECTOR_TARGET_PCT)) / 100;
    moves.push({
      kind: "sector",
      title: L(`Too much is in ${top.name}`, `${top.name} সেক্টরে বেশি টাকা`),
      line: L(
        `${top.weightPct.toFixed(0)}% of your money is in one sector, about ${takaGroup(excess)} more than ${SECTOR_TARGET_PCT}%. Your next buys are best made in other sectors.`,
        `আপনার টাকার ${top.weightPct.toFixed(0)}% একটি সেক্টরে, যা ${SECTOR_TARGET_PCT}%-এর চেয়ে প্রায় ${takaGroup(excess)} বেশি। পরের কেনাগুলো অন্য সেক্টরে করাই ভালো।`,
      ),
      amount: excess,
      href: "#pf-buynext",
      cta: L("See ideas outside it", "এর বাইরের আইডিয়া দেখুন"),
      weight: excess,
    });
  }

  const firstPick = plan?.picks.find((p) => p.kind === "new_sector" || p.kind === "spread");
  if (hs.length > 0 && hs.length < 5) {
    const amt = firstPick?.suggest?.amount ?? total / hs.length;
    moves.push({
      kind: "few",
      title: L("Add a stock from a sector you don't own", "যে সেক্টর নেই সেখান থেকে একটি শেয়ার যোগ করুন"),
      line: L(
        `With ${hs.length} stock${hs.length === 1 ? "" : "s"}, one bad company moves everything. About ${takaGroup(amt)} in one more spreads the risk.`,
        `${hs.length}টি শেয়ারে একটি খারাপ কোম্পানিই সব নাড়িয়ে দেয়। আরেকটিতে প্রায় ${takaGroup(amt)} রাখলে ঝুঁকি ছড়ায়।`,
      ),
      amount: amt,
      href: "#pf-buynext",
      cta: L("See ideas", "আইডিয়া দেখুন"),
      weight: amt * 0.8,
    });
  }

  if (hs.length >= 3 && !hs.some((h) => (h.pillars.p5_div ?? 0) >= 7)) {
    const amt = total / 9;
    moves.push({
      kind: "dividend",
      title: L("Add a steady dividend payer", "নিয়মিত ডিভিডেন্ড দেয় এমন শেয়ার যোগ করুন"),
      line: L(
        "None of your stocks pays a steady dividend. One that does brings cash in every year, whatever the price does.",
        "আপনার কোনো শেয়ার নিয়মিত ডিভিডেন্ড দেয় না। একটি দিলে দাম যা-ই হোক, প্রতি বছর নগদ টাকা আসে।",
      ),
      amount: amt,
      href: "#pf-buynext",
      cta: L("See ideas", "আইডিয়া দেখুন"),
      weight: amt * 0.5,
    });
  }

  moves.sort((a, b) => b.weight - a.weight);
  const strip = ({ weight: _w, ...m }: NextMove & { weight: number }): NextMove => m;
  if (moves.length === 0) {
    return {
      first: {
        kind: "none",
        title: L("Nothing urgent to do", "এখন জরুরি কিছু নেই"),
        line: L(
          "Your portfolio has no open warnings. Look again when the next quarterly results come out. That is the natural time to review.",
          "আপনার পোর্টফোলিওতে এখন কোনো সতর্কতা নেই। পরের প্রান্তিকের ফলাফল বের হলে আবার দেখুন। যাচাই করার সেটিই স্বাভাবিক সময়।",
        ),
        amount: null,
        href: null,
        cta: null,
      },
      more: [],
    };
  }
  return { first: strip(moves[0]), more: moves.slice(1, 3).map(strip) };
}

// ── What would raise your grade ────────────────────────────────────────────

export interface GradeLift {
  label: string;
  fromGrade: Grade;
  toGrade: Grade;
  fromOverall: number;
  toOverall: number;
  changes: { key: "spread" | "quality" | "entry"; label: string; from: number; to: number }[];
}

function rowFor(code: string, qty: number, price: number, ltp: number | null, name: string | null): ComputedRow {
  const cost = qty * price;
  const value = ltp != null ? qty * ltp : null;
  const pnl = value != null ? value - cost : null;
  return {
    holding: { id: `lift-${code}`, trading_code: code, qty, buy_price: price, added_at: new Date().toISOString().slice(0, 10) },
    ltp,
    company_name: name,
    cost_basis: cost,
    current_value: value,
    pnl,
    pnl_pct: pnl != null && cost > 0 ? (pnl / cost) * 100 : null,
  };
}

/** Up to three single changes that would raise the grade, biggest lift first. */
export function gradeLifts(
  rows: ComputedRow[],
  priceMap: Map<string, ScoreItem>,
  analysis: PortfolioAnalysis,
  plan: RebalancePlan | null,
  lang: AnalysisLang,
): GradeLift[] {
  if (rows.length === 0) return [];
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const labels = { spread: L("Spread", "বণ্টন"), quality: L("Quality", "মান"), entry: L("Price paid", "কেনার দাম") };
  const scenarios: { label: string; rows: ComputedRow[] }[] = [];
  const addRow = (rs: ComputedRow[], code: string, shares: number) => {
    const item = priceMap.get(code);
    if (!item?.ltp || shares <= 0) return rs;
    return [...rs, rowFor(code, shares, item.ltp, item.ltp, item.company_name ?? null)];
  };

  // 1. Buy the first idea at its example size.
  const pick = plan?.picks.find((p) => p.kind !== "swap" && p.suggest);
  if (pick?.suggest) {
    scenarios.push({
      label: L(
        `Buy about ${pick.suggest.shares} shares of ${pick.code} (${takaGroup(pick.suggest.amount)})`,
        `${pick.code}-এর প্রায় ${pick.suggest.shares}টি শেয়ার কিনুন (${takaGroup(pick.suggest.amount)})`,
      ),
      rows: addRow(rows, pick.code, pick.suggest.shares),
    });
  }

  // 2. Sell what is marked Sell.
  const sellCodes = new Set(analysis.holdings.filter((h) => h.signal.signal === "sell").map((h) => h.code));
  if (sellCodes.size > 0 && sellCodes.size < rows.length) {
    scenarios.push({
      label: L(`Sell ${names([...sellCodes], false)} (marked Sell)`, `${names([...sellCodes], true)} বিক্রি করুন (বিক্রির সংকেত)`),
      rows: rows.filter((r) => !sellCodes.has(r.holding.trading_code)),
    });
  }

  // 3. Trim the biggest stock to 25% of what is left.
  const big = [...analysis.holdings].sort((a, b) => b.weightPct - a.weightPct)[0];
  if (big && rows.length > 1 && big.weightPct > MAX_STOCK_PCT + 5 && big.ltp) {
    const total = analysis.holdings.reduce((acc, h) => acc + valueOf(h), 0);
    const t = MAX_STOCK_PCT / 100;
    const keep = Math.max(1, Math.floor((t * (total - big.qty * big.ltp)) / ((1 - t) * big.ltp)));
    if (keep < big.qty) {
      scenarios.push({
        label: L(`Trim ${big.code} to about ${MAX_STOCK_PCT}% (sell ${big.qty - keep} shares)`, `${big.code} কমিয়ে প্রায় ${MAX_STOCK_PCT}% করুন (${big.qty - keep}টি বিক্রি)`),
        rows: rows.map((r) =>
          r.holding.trading_code === big.code ? rowFor(big.code, keep, r.holding.buy_price, r.ltp, r.company_name) : r,
        ),
      });
    }
  }

  // 4. Swap a weak holding for the idea in its sector.
  const swap = plan?.picks.find((p) => p.kind === "swap" && p.replaces && p.suggest);
  if (swap?.replaces && swap.suggest) {
    const without = rows.filter((r) => r.holding.trading_code !== swap.replaces);
    if (without.length > 0) {
      scenarios.push({
        label: L(`Swap ${swap.replaces} for ${swap.code}`, `${swap.replaces}-এর বদলে ${swap.code}`),
        rows: addRow(without, swap.code, swap.suggest.shares),
      });
    }
  }

  const before = analysis.subScores;
  return scenarios
    .map((s) => {
      const after = analyzePortfolio(s.rows, priceMap, lang);
      const changes = (["spread", "quality", "entry"] as const)
        .filter((k) => Math.abs(after.subScores[k] - before[k]) >= 0.1)
        .map((k) => ({ key: k, label: labels[k], from: before[k], to: after.subScores[k] }));
      return {
        label: s.label,
        fromGrade: analysis.grade,
        toGrade: after.grade,
        fromOverall: before.overall,
        toOverall: after.subScores.overall,
        changes,
      };
    })
    .filter((l) => l.toOverall - l.fromOverall >= 0.1)
    .sort((a, b) => b.toOverall - b.fromOverall - (a.toOverall - a.fromOverall))
    .slice(0, 3);
}
