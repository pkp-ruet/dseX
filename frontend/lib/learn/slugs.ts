/**
 * Every lesson's two addresses, and nothing else, so the navbar's language
 * switch (`lib/i18n-pairs.ts`, a client import) can pair the English and
 * Bengali pages without loading the lessons themselves.
 *
 * A lesson that replaced an old post keeps that post's slug, so the address
 * keeps its search history (open-bo-account, buy-sell-shares, fundamental-
 * analysis / good-stock-key-numbers, and the Bengali why-long-term-investing-
 * wins, understand-market-momentum, power-of-compounding, when-to-sell-shares,
 * master-fear-and-greed, ignore-rumors-do-research). Old posts folded into a
 * lesson without a slug of their own 301 in next.config.ts. Don't rename a
 * slug that is live; add a 301 if you ever must.
 */
export const LESSON_SLUGS = {
  // Getting started: three posts, the steps from no account to a sale.
  "start-1": { en: "open-bo-account", bn: "open-bo-account" },
  "start-2": { en: "buy-sell-shares", bn: "buy-sell-shares" },
  "start-3": { en: "sell-shares-get-your-money", bn: "sell-shares-get-your-money" },
  // Investing basics.
  "basics-1": { en: "how-the-share-market-works", bn: "how-the-share-market-works" },
  "basics-2": { en: "trading-or-investing", bn: "why-long-term-investing-wins" },
  "basics-3": { en: "read-the-market-each-day", bn: "understand-market-momentum" },
  "basics-4": { en: "fundamental-analysis", bn: "good-stock-key-numbers" },
  "basics-5": { en: "cheap-or-expensive", bn: "cheap-or-expensive" },
  "basics-6": { en: "how-many-shares-to-own", bn: "how-many-shares-to-own" },
  "basics-7": { en: "investing-every-month", bn: "power-of-compounding" },
  "basics-8": { en: "when-to-sell-shares", bn: "when-to-sell-shares" },
  "basics-9": { en: "when-the-market-falls", bn: "master-fear-and-greed" },
  "basics-10": { en: "rumour-shares", bn: "ignore-rumors-do-research" },
  // Advanced (Premium after the first section). Three replaced free posts and
  // kept their addresses: read-annual-report, judge-a-bank-stock and
  // understanding-sectors / understand-sectors.
  "adv-1": { en: "read-annual-report", bn: "read-annual-report" },
  "adv-2": { en: "quarterly-results", bn: "quarterly-results" },
  "adv-3": { en: "is-the-profit-real", bn: "is-the-profit-real" },
  "adv-4": { en: "fair-price-yourself", bn: "fair-price-yourself" },
  "adv-5": { en: "will-the-dividend-continue", bn: "will-the-dividend-continue" },
  "adv-6": { en: "warning-signs", bn: "warning-signs" },
  "adv-7": { en: "owners-buying-selling", bn: "owners-buying-selling" },
  "adv-8": { en: "judge-a-bank-stock", bn: "judge-a-bank-stock" },
  "adv-9": { en: "understanding-sectors", bn: "understand-sectors" },
  "adv-10": { en: "how-much-in-each-share", bn: "how-much-in-each-share" },
  "adv-11": { en: "tax-for-share-investors", bn: "tax-for-share-investors" },
} as const satisfies Record<string, { en: string; bn: string }>;

export type LessonId = keyof typeof LESSON_SLUGS;

/** English lesson slug → Bengali lesson slug. */
export const LESSON_EN_TO_BN: Record<string, string> = Object.fromEntries(
  Object.values(LESSON_SLUGS).map((s) => [s.en, s.bn]),
);
