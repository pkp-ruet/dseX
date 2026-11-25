import type { MarketStateData, ScoreItem } from "@/lib/api";
import { SAMPLE_PORTFOLIOS } from "@/lib/sample-portfolios";

/**
 * The guest home (2026-11-23, user: the signed-out landing "doesn't tell much
 * about what user will get after sign in … mostly a promotional page", then
 * "redo the mockup in the blended form" → "Yes, build it"; mockup
 * https://claude.ai/artifact/2rXAyT319sXtJXWBjE6rMG, version 2).
 *
 * A guest lands on the signed-in home's own layout. Public blocks show today's
 * data; the personal blocks show a labelled example built from today's real
 * market. Everything here is pure and serializable, built on the server in
 * both languages from the requests `app/page.tsx` already makes.
 */

export interface Bi {
  en: string;
  bn: string;
}

/** "Square Pharmaceuticals PLC." → "Square Pharmaceuticals". */
export function shortCompany(name: string | null | undefined, code: string): string {
  const n = (name ?? "").replace(/\s+(Limited|Ltd\.?|PLC\.?|Company)\s*$/i, "").trim();
  return n || code;
}

// ---------------------------------------------------------------- the band

/** The example portfolio in the band's money spot: the well-spread sample
 *  (the same one /sample-portfolio/diversified shows) at today's prices. No
 *  profit since bought: the sample's buy prices are made up. */
export interface GuestMoney {
  value: number;
  /** Taka move on the last trading day. */
  delta: number | null;
  shares: number;
  grade: string | null;
}

export function sampleMoney(byCode: Map<string, ScoreItem>, grade: string | null): GuestMoney | null {
  const holdings = SAMPLE_PORTFOLIOS.diversified.holdings;
  let value = 0;
  let delta = 0;
  let known = 0;
  for (const h of holdings) {
    const s = byCode.get(h.trading_code);
    if (!s || s.ltp == null) return null; // a sample missing a price would lie about itself
    value += h.qty * s.ltp;
    if (s.change_pct != null) {
      // Yesterday's close from today's and the change.
      delta += h.qty * (s.ltp - s.ltp / (1 + s.change_pct / 100));
      known += 1;
    }
  }
  return { value, delta: known ? delta : null, shares: holdings.length, grade };
}

// --------------------------------------------------- 6 · today on the site

// ------------------------------------------------------------ 3 · your shares

/** "Your shares" for a guest (2026-11-25): the same sample portfolio as the
 *  band's money, at today's prices, most money first. Tagged Example. */
export interface ExampleShare {
  code: string;
  name: string;
  qty: number;
  value: number;
  change: number | null;
}

export function sampleShares(byCode: Map<string, ScoreItem>, limit = 5): ExampleShare[] {
  const out: ExampleShare[] = [];
  for (const h of SAMPLE_PORTFOLIOS.diversified.holdings) {
    const s = byCode.get(h.trading_code);
    if (!s || s.ltp == null) return []; // a sample missing a price would lie about itself
    out.push({
      code: h.trading_code,
      name: shortCompany(s.company_name, h.trading_code),
      qty: h.qty,
      value: h.qty * s.ltp,
      change: s.change_pct ?? null,
    });
  }
  return out.sort((a, b) => b.value - a.value).slice(0, limit);
}

export const EXAMPLE_TAG: Bi = { en: "Example", bn: "উদাহরণ" };

export function guestWhen(market: MarketStateData | null, todayIso: string): "today" | "last" {
  return market?.date && market.date.slice(0, 10) === todayIso ? "today" : "last";
}
