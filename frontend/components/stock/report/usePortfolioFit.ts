"use client";

import { useEffect, useMemo, useState } from "react";
import { useMyStake } from "@/components/stock/YourPosition";
import { flattenTiers, getScores, type ScoreItem } from "@/lib/api";
import { buildPortfolioFit, type PortfolioFit } from "@/lib/portfolio-fit";

/**
 * The portfolio check's data for one stock page (2026-11-04): the signed-in
 * reader's main portfolio (shared with the hero card) and the scores list the
 * portfolio page grades with, loaded only once they have shares. Returns the
 * check for `spend` taka and at the suggested amount, or null before then.
 */
export function usePortfolioFit(code: string, ltp: number | null, spend: number | null = null): {
  fit: PortfolioFit | null;
  /** The check at the suggested amount. */
  suggested: PortfolioFit | null;
  /** Signed in with at least one share in the main portfolio. */
  hasPortfolio: boolean;
} {
  const { isLoggedIn, holdings } = useMyStake(code);
  const has = isLoggedIn && !!holdings && holdings.length > 0;
  const [priceMap, setPriceMap] = useState<Map<string, ScoreItem> | null>(null);

  useEffect(() => {
    if (!has || priceMap) return;
    let alive = true;
    getScores()
      .then((s) => {
        if (alive) setPriceMap(new Map(flattenTiers(s).map((x) => [x.trading_code.toUpperCase(), x])));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [has, priceMap]);

  const suggested = useMemo(
    () => (has && priceMap && holdings ? buildPortfolioFit({ holdings, priceMap, code, ltp }) : null),
    [has, priceMap, holdings, code, ltp],
  );
  const fit = useMemo(
    () =>
      spend == null
        ? suggested
        : has && priceMap && holdings
          ? buildPortfolioFit({ holdings, priceMap, code, ltp, spend })
          : null,
    [suggested, has, priceMap, holdings, code, ltp, spend],
  );
  return { fit, suggested, hasPortfolio: has };
}
