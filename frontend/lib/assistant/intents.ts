/**
 * Intent predicates — small, readable matchers the parser composes. Each works
 * on the normalized (lower-case, de-punctuated) text. Keyword lists live in
 * synonyms.ts so the vocabulary stays in one place.
 */
import { wordIn } from "./entities";
import {
  GREETING_WORDS,
  HELP_WORDS,
  SUGGEST_WORDS,
  MARKET_WORDS,
  GAINER_WORDS,
  LOSER_WORDS,
  ACTIVE_WORDS,
  NEAR_LOW_WORDS,
  GOOD_BUY_WORDS,
  PE_WORDS,
} from "./synonyms";

function anyHit(norm: string, words: string[]): boolean {
  return words.some((w) => (w.includes(" ") ? norm.includes(w) : wordIn(norm, w)));
}

export const isGreeting = (norm: string) =>
  anyHit(norm, GREETING_WORDS) && norm.split(" ").length <= 3;

export const isHelp = (norm: string) => anyHit(norm, HELP_WORDS);

export const isSuggest = (norm: string) => anyHit(norm, SUGGEST_WORDS);

export const isMarketPulse = (norm: string) => anyHit(norm, MARKET_WORDS);

export const isNearLow = (norm: string) => anyHit(norm, NEAR_LOW_WORDS);

export const isGoodBuy = (norm: string) => anyHit(norm, GOOD_BUY_WORDS);

export const wantsPe = (norm: string) => anyHit(norm, PE_WORDS);

export function moversKind(norm: string): "gainers" | "losers" | "active" | null {
  if (anyHit(norm, GAINER_WORDS)) return "gainers";
  if (anyHit(norm, LOSER_WORDS)) return "losers";
  if (anyHit(norm, ACTIVE_WORDS)) return "active";
  return null;
}
