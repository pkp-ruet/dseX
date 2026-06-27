/**
 * The company universe for the assistant: a flattened, cached list of every
 * scored stock (from /api/scores). Used for ticker/name resolution by the
 * parser and as the data source for most screens.
 */
import { getScores, type ScoreItem } from "@/lib/api";
import type { CompanyRef } from "./types";

let universePromise: Promise<ScoreItem[]> | null = null;

/** All scored companies, flattened across tiers. Cached for the session. */
export function loadScoreUniverse(): Promise<ScoreItem[]> {
  if (!universePromise) {
    universePromise = getScores()
      .then((res) => [
        ...res.tiers.strong_buy,
        ...res.tiers.safe_buy,
        ...res.tiers.watch,
        ...res.tiers.avoid,
      ])
      .catch((err) => {
        // Let a later call retry rather than caching the failure forever.
        universePromise = null;
        throw err;
      });
  }
  return universePromise;
}

/** Lightweight {code, name} list for ticker matching. */
export async function loadCompanyIndex(): Promise<CompanyRef[]> {
  const universe = await loadScoreUniverse();
  return universe.map((s) => ({ trading_code: s.trading_code, company_name: s.company_name }));
}

/** Distinct, sorted sector labels present in the universe. */
export function uniqueSectors(universe: ScoreItem[]): string[] {
  return Array.from(
    new Set(universe.map((s) => s.sector).filter((s): s is string => Boolean(s))),
  ).sort();
}

/** Quick code → ScoreItem map for enrichment (e.g. attaching change_pct). */
export function indexByCode(universe: ScoreItem[]): Map<string, ScoreItem> {
  return new Map(universe.map((s) => [s.trading_code.toUpperCase(), s]));
}
