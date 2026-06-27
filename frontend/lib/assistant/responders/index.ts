/**
 * Dispatcher: a parsed message → response blocks. Pure data assembly; the React
 * hook handles timing, the suggest-flow state machine, and slot chips. Single
 * stock + screen results get a "not advice" disclaimer appended.
 */
import { COPY } from "../copy";
import { STARTER_CHIPS, FALLBACK_CHIPS } from "../chips";
import type { Chip, MessageBlock, ParseResult } from "../types";
import { marketPulseResponder } from "./marketPulse";
import { moversResponder } from "./movers";
import { singleStockResponder, type SingleStockKind } from "./singleStock";
import { screenResponder } from "./screen";
import { tipsResponder } from "./tips";
import { dividendsResponder } from "./dividends";

export function greetingBlocks(): MessageBlock[] {
  return [
    { type: "text", text: COPY.greeting.text, bn: COPY.greeting.bn },
    { type: "chips", chips: STARTER_CHIPS, layout: "wrap" },
  ];
}

export function helpBlocks(): MessageBlock[] {
  return [
    { type: "text", text: COPY.help.text },
    { type: "chips", chips: STARTER_CHIPS, layout: "wrap" },
  ];
}

export function fallbackBlocks(): MessageBlock[] {
  return [
    { type: "text", text: COPY.fallback.text },
    { type: "chips", chips: FALLBACK_CHIPS, layout: "wrap" },
  ];
}

export function errorBlocks(): MessageBlock[] {
  return [
    { type: "text", text: COPY.error.text },
    { type: "chips", chips: FALLBACK_CHIPS, layout: "wrap" },
  ];
}

function hasResults(blocks: MessageBlock[]): boolean {
  return blocks.some(
    (b) => b.type === "stock-list" || b.type === "recommended-list" || b.type === "stock-detail",
  );
}

const withDisclaimer = (blocks: MessageBlock[]): MessageBlock[] =>
  hasResults(blocks) ? [...blocks, { type: "disclaimer" }] : blocks;

const SINGLE_STOCK_KIND: Record<string, SingleStockKind> = {
  stock_dividend: "dividend",
  stock_pe: "pe",
  stock_cheap: "cheap",
  stock_good_buy: "good_buy",
  stock_detail: "detail",
};

export async function respond(parsed: ParseResult): Promise<MessageBlock[]> {
  const { intent, entities } = parsed;

  switch (intent) {
    case "greeting":
      return greetingBlocks();
    case "help":
      return helpBlocks();

    case "market_pulse":
      return marketPulseResponder();
    case "movers_gainers":
      return moversResponder("gainers");
    case "movers_losers":
      return moversResponder("losers");
    case "movers_active":
      return moversResponder("active");

    case "stock_detail":
    case "stock_good_buy":
    case "stock_dividend":
    case "stock_pe":
    case "stock_cheap": {
      if (!entities.code) {
        if (entities.candidates?.length) {
          const chips: Chip[] = entities.candidates.map((c) => ({
            label: c.company_name ? `${c.trading_code} · ${c.company_name}` : c.trading_code,
            action: { intentId: "stock_detail", entities: { code: c.trading_code } },
          }));
          return [
            { type: "text", text: COPY.stock.didYouMean },
            { type: "chips", chips, layout: "wrap" },
          ];
        }
        return [
          { type: "text", text: COPY.stock.askWhich },
          { type: "chips", chips: STARTER_CHIPS, layout: "wrap" },
        ];
      }
      return withDisclaimer(
        await singleStockResponder(entities.code, SINGLE_STOCK_KIND[intent] ?? "detail"),
      );
    }

    case "screen_cheap":
    case "screen_dividend":
    case "screen_safe":
    case "screen_growth":
    case "screen_momentum":
    case "screen_near_low":
    case "screen_sector":
    case "screen_price_cap":
    case "screen_top":
      return withDisclaimer(await screenResponder(intent, entities));

    case "tips":
      return tipsResponder();

    case "dividends":
      return dividendsResponder();

    case "suggest_stocks":
      // Driven by the hook's slot flow — never resolved here.
      return [];

    case "fallback":
    default:
      return fallbackBlocks();
  }
}
