/**
 * The home page's portfolio slide (2026-11-18, user: "make the first slide
 * based on portfolio as its our most used premium feature"). Pure: what a
 * free reader's portfolio check would talk about, counted from the holdings
 * and the scores the home page already has — never a share's name, never
 * what to do (that is the Premium check on /portfolio), and no taka amounts:
 * the home page hides the reader's money until they tap the eye.
 */
import type { PortfolioHolding, ScoreItem } from "@/lib/api";
import { tierWords } from "@/lib/constants";
import { analyzePortfolio, isFinancialSector, type ComputedRow, type Grade } from "@/lib/portfolio-analysis";
import { FIN_HEAVY_PCT, MIN_SHARES, ONE_SHARE_FAIR_PCT, SECTOR_FAIR_PCT } from "@/lib/portfolio-limits";

type Bi = { en: string; bn: string };

/** A share this far below what was paid counts as "in a loss" (the portfolio's loss rule). */
const LOSS_PCT = 5;
/** Findings the slide shows. */
const MAX_FINDINGS = 3;

/** Holdings priced at today's close, the shape `analyzePortfolio` reads. */
export function computedRows(holdings: PortfolioHolding[], priceMap: Map<string, ScoreItem>): ComputedRow[] {
  return holdings.map((h) => {
    const item = priceMap.get(h.trading_code.toUpperCase());
    const ltp = item?.ltp ?? null;
    const cost = h.qty * h.buy_price;
    const current = ltp != null ? h.qty * ltp : null;
    const pnl = current != null ? current - cost : null;
    return {
      holding: h,
      ltp,
      company_name: item?.company_name ?? null,
      cost_basis: cost,
      current_value: current,
      pnl,
      pnl_pct: pnl != null && cost > 0 ? (pnl / cost) * 100 : null,
    };
  });
}

export interface PortfolioGlance {
  /** How many shares the main portfolio holds. */
  shares: number;
  grade: Grade;
  /** Most important first, at most three; empty when nothing stands out. */
  findings: Bi[];
}

/** What the portfolio slide says, or null without priced holdings. */
export function portfolioGlance(
  holdings: PortfolioHolding[],
  priceMap: Map<string, ScoreItem>,
): PortfolioGlance | null {
  if (holdings.length === 0 || priceMap.size === 0) return null;
  const rows = computedRows(holdings, priceMap);
  if (!rows.some((r) => r.current_value != null)) return null;

  const a = analyzePortfolio(rows, priceMap, "en");
  const total = a.holdings.length;
  const out: Bi[] = [];

  // 1 · Shares in companies we grade mostly weak.
  const weak = a.holdings.filter((h) => h.tierKey === "weak").length;
  if (weak > 0) {
    const w = tierWords("weak");
    out.push({
      en: `${weak} of your ${total} shares ${weak === 1 ? "is in a company" : "are in companies"} we grade “${w.en}”.`,
      bn: `আপনার ${total}টির মধ্যে ${weak}টি শেয়ার এমন কোম্পানির, যাকে আমরা “${w.bn}” বলি।`,
    });
  }

  // 2 · Shares more than 5% below what was paid.
  const down = a.holdings.filter((h) => h.pnlPct != null && h.pnlPct < -LOSS_PCT).length;
  if (down > 0) {
    out.push({
      en: `${down} ${down === 1 ? "share is" : "shares are"} more than ${LOSS_PCT}% below what you paid.`,
      bn: `${down}টি শেয়ার কেনা দামের চেয়ে ${LOSS_PCT}%-এর বেশি নিচে।`,
    });
  }

  // 3 · Too much in one place: one share, one business, or finance together.
  const top = a.holdings.reduce((m, h) => Math.max(m, h.weightPct), 0);
  const sector = a.sectorSpread.reduce((m, s) => Math.max(m, s.weightPct), 0);
  const fin = a.holdings.filter((h) => isFinancialSector(h.sector)).reduce((s, h) => s + h.weightPct, 0);
  if (top > ONE_SHARE_FAIR_PCT && total > 1) {
    const p = Math.round(top);
    out.push({ en: `One share holds ${p}% of your money.`, bn: `একটি শেয়ারেই আপনার টাকার ${p}%।` });
  } else if (sector > SECTOR_FAIR_PCT && total > 1) {
    const p = Math.round(sector);
    out.push({ en: `${p}% of your money is in one business.`, bn: `আপনার টাকার ${p}% একটি ব্যবসায়।` });
  } else if (fin > FIN_HEAVY_PCT) {
    const p = Math.round(fin);
    out.push({
      en: `${p}% of your money is in banks, finance and insurers.`,
      bn: `আপনার টাকার ${p}% ব্যাংক, ফাইন্যান্স আর বিমায়।`,
    });
  }

  // 4 · Too few shares.
  if (total < MIN_SHARES) {
    out.push({
      en: `You hold ${total} ${total === 1 ? "share" : "shares"}, so each one weighs a lot.`,
      bn: `আপনার মাত্র ${total}টি শেয়ার, তাই প্রতিটির ভার অনেক।`,
    });
  }

  return { shares: total, grade: a.grade, findings: out.slice(0, MAX_FINDINGS) };
}
