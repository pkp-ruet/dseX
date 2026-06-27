/**
 * The rule-based "understanding" step. Turns raw text into an intent + entities
 * via a small decision tree (no LLM). Resolved tickers dominate; screening goals
 * and market phrases come next; anything unclear falls through to `fallback`,
 * which the UI answers with chips.
 */
import type { CompanyRef, Entities, IntentId, ParseResult } from "./types";
import { buildEntities, normalize } from "./entities";
import {
  isGreeting,
  isHelp,
  isSuggest,
  isMarketPulse,
  isNearLow,
  isGoodBuy,
  wantsPe,
  moversKind,
} from "./intents";

export function parse(raw: string, index: CompanyRef[]): ParseResult {
  const text = raw.trim();
  const norm = normalize(text);
  const make = (intent: IntentId, entities: Entities = {}, confidence = 0.6): ParseResult => ({
    intent,
    entities,
    confidence,
    raw: text,
  });

  if (!norm) return make("fallback", {}, 0);

  const ent = buildEntities(text, norm, index);
  const hasTopic = Boolean(ent.code || ent.metric || ent.sector || ent.priceCap);

  // 1) Greeting / help — only when nothing more specific is in play.
  if (isGreeting(norm) && !hasTopic) return make("greeting", {}, 1);
  if (isHelp(norm) && !hasTopic && !isSuggest(norm)) return make("help", {}, 0.9);

  // 2) Single-stock questions — a resolved code wins.
  if (ent.code) {
    if (wantsPe(norm)) return make("stock_pe", ent, 0.95);
    if (ent.metric === "dividend") return make("stock_dividend", ent, 0.95);
    if (ent.metric === "cheap") return make("stock_cheap", ent, 0.9);
    if (isGoodBuy(norm)) return make("stock_good_buy", ent, 0.9);
    return make("stock_detail", ent, 0.8);
  }
  // A ticker/name was attempted but ambiguous → UI offers "did you mean".
  if (ent.candidates?.length) return make("stock_detail", ent, 0.4);

  // 3) Guided recommendation (beats a bare metric so "suggest dividend stocks"
  //    starts the flow with dividend pre-filled).
  if (isSuggest(norm)) return make("suggest_stocks", ent, 0.95);

  // 4) Screens (no specific stock). Combos keep sector/price filters in `ent`.
  if (ent.priceCap != null) return make("screen_price_cap", ent, 0.9);
  if (isNearLow(norm)) return make("screen_near_low", ent, 0.9);
  if (ent.metric === "dividend") return make("screen_dividend", ent, 0.9);
  if (ent.metric === "growth") return make("screen_growth", ent, 0.9);
  if (ent.metric === "momentum") return make("screen_momentum", ent, 0.9);
  if (ent.metric === "cheap") return make("screen_cheap", ent, 0.9);
  if (ent.metric === "safe") return make("screen_safe", ent, 0.9);

  // 5) Market updates.
  const mk = moversKind(norm);
  if (mk === "gainers") return make("movers_gainers", ent, 0.9);
  if (mk === "losers") return make("movers_losers", ent, 0.9);
  if (mk === "active") return make("movers_active", ent, 0.9);
  if (isMarketPulse(norm)) return make("market_pulse", ent, 0.85);

  // 6) Bare sector → quality screen for that sector.
  if (ent.sector) return make("screen_sector", ent, 0.75);

  return make("fallback", ent, 0.2);
}
