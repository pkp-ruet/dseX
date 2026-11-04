import { apiGetPortfolio, type PortfolioHolding } from "@/lib/api";

// One portfolio read per page (2026-11-04): on the stock page the hero card,
// "You and this stock" and the portfolio check ask for it within a moment of
// each other; on the dividend calendar the Premium card and the income card.
let shared: { at: number; promise: Promise<PortfolioHolding[]> } | null = null;

/** The signed-in reader's main-portfolio holdings, shared for 30 seconds. */
export function loadMainHoldings(): Promise<PortfolioHolding[]> {
  if (!shared || Date.now() - shared.at > 30_000) {
    const promise = apiGetPortfolio().then((r) => r.holdings ?? []);
    shared = { at: Date.now(), promise };
    promise.catch(() => {
      if (shared?.promise === promise) shared = null;
    });
  }
  return shared.promise;
}

/** Shares held per code (upper case), summed across rows. */
export function heldQty(holdings: PortfolioHolding[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const h of holdings) {
    const c = h.trading_code.toUpperCase();
    m.set(c, (m.get(c) ?? 0) + (Number(h.qty) || 0));
  }
  return m;
}
