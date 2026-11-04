/**
 * "What would it do to your portfolio?" (2026-11-04) — one buy of this share
 * checked against the reader's own main portfolio, on the stock page. Runs the
 * portfolio page's own grade (`analyzePortfolio`) before and after, so the
 * letter here can never disagree with the one on /portfolio, and says in plain
 * words what moves: the grade, the share's part of their money, its business,
 * banks and finance, money in strong companies, cash dividends a year, how many
 * shares their money really rests on, and for a holder, the new average price.
 *
 * Pure and built in the browser from what the stock page loads for a signed-in
 * reader (their holdings + the scores list). Every sentence is an `{en, bn}`
 * pair; the reading rules are the portfolio report's (no market jargon, no
 * scores out of 10). Priced at today's close, before fees; nothing is saved.
 */
import type { PortfolioHolding, ScoreItem } from "@/lib/api";
import { money, takaGroup } from "@/lib/formatters";
import { analyzePortfolio, isFinancialSector, type ComputedRow, type Grade, type PortfolioAnalysis } from "@/lib/portfolio-analysis";
import { sectorWord } from "@/lib/portfolio-report";
import type { Bi, Tone } from "@/lib/stock-report";

/** A share above this part of the money is too big (the portfolio's rule). */
const STOCK_LINE = 25;
/** One business above this part of the money is too big. */
const SECTOR_LINE = 40;
/** Banks + finance + insurers above this part of the money lean too hard on lenders. */
const FINANCE_LINE = 50;

export interface FitLine {
  key: "grade" | "weight" | "sector" | "finance" | "strong" | "cash" | "count" | "avg";
  label: Bi;
  from: string;
  to: string;
  tone: Tone;
  /** One short line under it (the rank among their shares, a line crossed). */
  note: Bi | null;
  changed: boolean;
}

export interface PortfolioFit {
  code: string;
  held: boolean;
  /** Shares in the portfolio now. */
  n: number;
  qty: number;
  spend: number;
  gradeFrom: Grade;
  gradeTo: Grade;
  word: Bi;
  tone: Tone;
  /** The answer, one or two sentences. */
  headline: Bi;
  lines: FitLine[];
  /** How many lines move. */
  changed: number;
  /** Years of its profit at today's price, against similar companies. */
  priceNote: Bi | null;
  /** A line this buy would cross (a share over a quarter, a business over 40%). */
  warning: Bi | null;
}

const B = (en: string, bn: string): Bi => ({ en, bn });
const pct = (v: number) => `${Math.round(v)}%`;
const GRADES: Grade[] = ["A", "B", "C", "D", "F"];
const BN_ORD = ["", "প্রথম", "দ্বিতীয়", "তৃতীয়", "চতুর্থ", "পঞ্চম", "ষষ্ঠ", "সপ্তম", "অষ্টম", "নবম", "দশম"];

function ordinalEn(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

function rankWords(rank: number): Bi {
  if (rank === 1) return B("It would be your biggest share.", "এটি হবে আপনার সবচেয়ে বড় শেয়ার।");
  return B(
    `It would be your ${ordinalEn(rank)} biggest share.`,
    rank <= 10 ? `এটি হবে আপনার ${BN_ORD[rank]} বড় শেয়ার।` : `বড় শেয়ারের তালিকায় এটি থাকবে ${rank} নম্বরে।`,
  );
}

function row(h: PortfolioHolding, priceMap: Map<string, ScoreItem>): ComputedRow {
  const item = priceMap.get(h.trading_code.toUpperCase());
  const ltp = item?.ltp ?? null;
  const cost = h.qty * h.buy_price;
  const value = ltp != null ? h.qty * ltp : null;
  const pnl = value != null ? value - cost : null;
  return {
    holding: h,
    ltp,
    company_name: item?.company_name ?? null,
    cost_basis: cost,
    current_value: value,
    pnl,
    pnl_pct: pnl != null && cost > 0 ? (pnl / cost) * 100 : null,
  };
}

const valueOf = (r: ComputedRow) => r.current_value ?? r.cost_basis;

/** The example buy: about a tenth of the money, an equal part below five
 *  shares (at most a fifth), or a quarter more for a share already held. */
export function suggestSpend(total: number, n: number, ltp: number, heldValue: number): number {
  let spend: number;
  if (heldValue > 0) spend = heldValue * 0.25;
  else {
    const target = n < 5 ? Math.min(0.2, 1 / (n + 1)) : 0.1;
    spend = (target * total) / (1 - target);
  }
  spend = Math.max(spend, ltp);
  // A friendly round figure: to the nearest ৳1,000 from ৳10,000 up.
  if (spend >= 10_000) spend = Math.round(spend / 1000) * 1000;
  return spend;
}

const yearlyCash = (a: PortfolioAnalysis, priceMap: Map<string, ScoreItem>) =>
  a.holdings.reduce((s, h) => {
    const y = priceMap.get(h.code.toUpperCase())?.div_yield_pct ?? 0;
    return y > 0 && h.ltp != null ? s + (h.qty * h.ltp * y) / 100 : s;
  }, 0);
const strongPct = (a: PortfolioAnalysis) =>
  a.holdings.filter((h) => h.tierKey === "excellent" || h.tierKey === "good").reduce((s, h) => s + h.weightPct, 0);
const financePct = (a: PortfolioAnalysis) =>
  a.holdings.filter((h) => isFinancialSector(h.sector)).reduce((s, h) => s + h.weightPct, 0);
const sectorPct = (a: PortfolioAnalysis, sector: string | null) =>
  sector ? a.holdings.filter((h) => h.sector === sector).reduce((s, h) => s + h.weightPct, 0) : 0;

/**
 * The check for buying `spend` taka of `code` at `ltp` (whole shares, at
 * least one). Null without holdings or a price.
 */
export function buildPortfolioFit({
  holdings,
  priceMap,
  code,
  ltp: pageLtp,
  spend: wanted,
}: {
  holdings: PortfolioHolding[];
  priceMap: Map<string, ScoreItem>;
  code: string;
  ltp: number | null;
  /** Taka to put in; the suggestion when absent. */
  spend?: number | null;
}): PortfolioFit | null {
  const CODE = code.toUpperCase();
  const item = priceMap.get(CODE);
  const ltp = item?.ltp ?? pageLtp;
  if (!holdings.length || ltp == null || ltp <= 0) return null;

  const rows = holdings.map((h) => row(h, priceMap));
  const mine = rows.filter((r) => r.holding.trading_code.toUpperCase() === CODE);
  const held = mine.length > 0;
  const total = rows.reduce((s, r) => s + valueOf(r), 0);
  const heldValue = mine.reduce((s, r) => s + valueOf(r), 0);
  const spendAsked = wanted != null && wanted > 0 ? wanted : suggestSpend(total, rows.length, ltp, heldValue);
  const qty = Math.max(1, Math.floor(spendAsked / ltp));
  const spend = qty * ltp;

  const before = analyzePortfolio(rows, priceMap, "en");

  // After: the share bought at today's price (merged into one row when held).
  const heldQty = mine.reduce((s, r) => s + r.holding.qty, 0);
  const heldCost = mine.reduce((s, r) => s + r.cost_basis, 0);
  const newQty = heldQty + qty;
  const newAvg = (heldCost + spend) / newQty;
  const added: PortfolioHolding = {
    id: `fit-${CODE}`,
    trading_code: mine[0]?.holding.trading_code ?? CODE,
    qty: newQty,
    buy_price: newAvg,
    added_at: mine[0]?.holding.added_at ?? new Date().toISOString().slice(0, 10),
    signal: mine[0]?.holding.signal ?? null,
  };
  const afterRows = [
    ...rows.filter((r) => r.holding.trading_code.toUpperCase() !== CODE),
    { ...row(added, priceMap), ltp, current_value: newQty * ltp, pnl: newQty * ltp - heldCost - spend, pnl_pct: ((newQty * ltp) / (heldCost + spend) - 1) * 100 },
  ];
  const after = analyzePortfolio(afterRows, priceMap, "en");

  const lines: FitLine[] = [];
  const push = (l: Omit<FitLine, "changed">) => lines.push({ ...l, changed: l.from !== l.to });

  // 1. The grade.
  const gUp = GRADES.indexOf(after.grade) < GRADES.indexOf(before.grade);
  const gDown = GRADES.indexOf(after.grade) > GRADES.indexOf(before.grade);
  push({
    key: "grade",
    label: B("Your portfolio grade", "আপনার পোর্টফোলিওর গ্রেড"),
    from: before.grade,
    to: after.grade,
    tone: gUp ? "good" : gDown ? "bad" : "neutral",
    note: null,
  });

  // 2. Its part of the money, and where it would rank.
  const me = after.holdings.find((h) => h.code.toUpperCase() === CODE);
  const wBefore = before.holdings.filter((h) => h.code.toUpperCase() === CODE).reduce((s, h) => s + h.weightPct, 0);
  const wAfter = me?.weightPct ?? 0;
  const rank = [...after.holdings].sort((a, b) => b.weightPct - a.weightPct).findIndex((h) => h.code.toUpperCase() === CODE) + 1;
  const tooBig = wAfter > STOCK_LINE;
  push({
    key: "weight",
    label: B(`${CODE}'s part of your money`, `আপনার টাকায় ${CODE}-এর অংশ`),
    from: pct(wBefore),
    to: pct(wAfter),
    tone: tooBig ? "bad" : "neutral",
    note: rank > 0 ? rankWords(rank) : null,
  });

  // 3. Its business.
  const sector = item?.sector ?? null;
  const sBefore = sectorPct(before, sector);
  const sAfter = sectorPct(after, sector);
  const sw = sector ? sectorWord(sector) : null;
  const sectorCross = sAfter > SECTOR_LINE && sBefore <= SECTOR_LINE;
  // Only when it says more than the share's own line (they hold others in it).
  if (sw && Math.round(sAfter) !== Math.round(wAfter)) {
    push({
      key: "sector",
      label: B(`Money in ${sw.en}`, `${sw.bn} সেক্টরে টাকা`),
      from: pct(sBefore),
      to: pct(sAfter),
      tone: sAfter > SECTOR_LINE ? "bad" : "neutral",
      note: sAfter > SECTOR_LINE ? B("More than 40% in one business.", "এক ব্যবসায় 40%-এর বেশি।") : null,
    });
  }

  // 4. Banks and finance, for a lender or an insurer.
  const fin = isFinancialSector(sector);
  const fBefore = financePct(before);
  const fAfter = financePct(after);
  const finCross = fin && fAfter > FINANCE_LINE && fBefore <= FINANCE_LINE;
  // Only when it says more than the business line (they hold other kinds of lender).
  if (fin && Math.round(fAfter) !== Math.round(sAfter)) {
    push({
      key: "finance",
      label: B("Banks, finance and insurers", "ব্যাংক, আর্থিক প্রতিষ্ঠান ও বিমা"),
      from: pct(fBefore),
      to: pct(fAfter),
      tone: fAfter > FINANCE_LINE ? "bad" : "neutral",
      note: fAfter > FINANCE_LINE ? B("More than half your money.", "আপনার অর্ধেকের বেশি টাকা।") : null,
    });
  }

  // 5. Money in strong companies.
  const stBefore = strongPct(before);
  const stAfter = strongPct(after);
  push({
    key: "strong",
    label: B("Money in strong companies", "শক্তিশালী কোম্পানিতে টাকা"),
    from: pct(stBefore),
    to: pct(stAfter),
    tone: Math.round(stAfter) > Math.round(stBefore) ? "good" : Math.round(stAfter) < Math.round(stBefore) ? "bad" : "neutral",
    note: null,
  });

  // 6. Cash dividends a year (last year's dividend at today's price, before tax).
  const cBefore = yearlyCash(before, priceMap);
  const cAfter = yearlyCash(after, priceMap);
  push({
    key: "cash",
    label: B("Cash dividends a year", "বছরে নগদ ডিভিডেন্ড"),
    from: takaGroup(cBefore),
    to: takaGroup(cAfter),
    tone: cAfter - cBefore >= 1 ? "good" : "neutral",
    note: null,
  });

  // 7. How many shares the money really rests on.
  const eBefore = Math.max(1, Math.round(before.effectiveStocks));
  const eAfter = Math.max(1, Math.round(after.effectiveStocks));
  push({
    key: "count",
    label: B("Your shares count like", "আপনার শেয়ার কাজ করে যেন"),
    from: String(eBefore),
    to: String(eAfter),
    tone: eAfter > eBefore ? "good" : eAfter < eBefore ? "bad" : "neutral",
    note: null,
  });

  // 8. A holder's new average price.
  if (held && heldQty > 0) {
    push({
      key: "avg",
      label: B("Your average price", "আপনার গড় কেনা দাম"),
      from: money(heldCost / heldQty),
      to: money(newAvg),
      tone: "neutral",
      note: null,
    });
  }

  // What it costs against its profit, from the after-run's own figures.
  const eps = item?.eps ?? null;
  const simPe = me?.sectorPe ?? null;
  const yearsNow = eps != null && eps > 0 ? ltp / eps : null;
  const priceNote =
    yearsNow != null && simPe != null && simPe > 0
      ? B(
          `At today's price you pay about ${Math.round(yearsNow)} years of its profit. Similar companies cost about ${Math.round(simPe)}.`,
          `আজকের দামে এর প্রায় ${Math.round(yearsNow)} বছরের মুনাফার সমান দাম দিচ্ছেন। একই ধরনের কোম্পানির দাম প্রায় ${Math.round(simPe)} বছরের।`,
        )
      : eps != null && eps <= 0
        ? B("It made a loss in its latest results, so there is no profit to price it on.", "সর্বশেষ ফলে এটি লোকসান করেছে, তাই মুনাফার হিসাবে এর দাম মাপা যায় না।")
        : null;

  const warning = tooBig
    ? B(`It would hold ${pct(wAfter)} of your money, more than a quarter in one share.`, `এতে আপনার টাকার ${pct(wAfter)} থাকবে, এক শেয়ারে এক-চতুর্থাংশের বেশি।`)
    : sectorCross && sw
      ? B(`More than 40% of your money would sit in ${sw.en}.`, `আপনার টাকার 40%-এর বেশি থাকবে ${sw.bn} সেক্টরে।`)
      : finCross
        ? B("Banks, finance and insurers would hold more than half your money.", "ব্যাংক, আর্থিক প্রতিষ্ঠান ও বিমায় থাকবে আপনার অর্ধেকের বেশি টাকা।")
        : null;

  // The answer.
  const buy = held
    ? B(`Buying ${takaGroup(spend)} more of ${CODE}`, `${CODE}-এর আরও ${takaGroup(spend)}-এর শেয়ার কিনলে`)
    : B(`Buying ${takaGroup(spend)} of ${CODE}`, `${CODE}-এর ${takaGroup(spend)}-এর শেয়ার কিনলে`);
  const dCash = cAfter - cBefore;
  let headline: Bi;
  if (gUp || gDown) {
    headline = B(
      `${buy.en} would ${gUp ? "lift" : "lower"} your portfolio grade from ${before.grade} to ${after.grade}.`,
      `${buy.bn} আপনার পোর্টফোলিওর গ্রেড ${before.grade} থেকে ${gUp ? "বেড়ে" : "কমে"} ${after.grade} হবে।`,
    );
  } else if (warning) {
    headline = B(
      `${buy.en} keeps your grade at ${after.grade}, but ${warning.en.charAt(0).toLowerCase()}${warning.en.slice(1)}`,
      `${buy.bn} গ্রেড ${after.grade}-ই থাকবে, তবে ${warning.bn}`,
    );
  } else if (dCash >= 1) {
    headline = B(
      `${buy.en} keeps your grade at ${after.grade} and adds about ${takaGroup(dCash)} a year in cash dividends.`,
      `${buy.bn} গ্রেড ${after.grade}-ই থাকবে, আর বছরে প্রায় ${takaGroup(dCash)} নগদ ডিভিডেন্ড বাড়বে।`,
    );
  } else {
    headline = B(`${buy.en} keeps your grade at ${after.grade}.`, `${buy.bn} গ্রেড ${after.grade}-ই থাকবে।`);
  }

  const word = gUp
    ? B(`Grade ${before.grade} → ${after.grade}`, `গ্রেড ${before.grade} → ${after.grade}`)
    : gDown
      ? B(`Grade ${before.grade} → ${after.grade}`, `গ্রেড ${before.grade} → ${after.grade}`)
      : B(`Grade stays ${after.grade}`, `গ্রেড ${after.grade}-ই থাকে`);
  const tone: Tone = gUp ? "good" : gDown ? "bad" : warning ? "fair" : "neutral";

  return {
    code: CODE,
    held,
    n: rows.length,
    qty,
    spend,
    gradeFrom: before.grade,
    gradeTo: after.grade,
    word,
    tone,
    headline,
    lines,
    changed: lines.filter((l) => l.changed).length,
    priceNote,
    warning,
  };
}
