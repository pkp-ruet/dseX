/**
 * English guide (`/learn/[slug]`) ↔ Bengali blog post (`/blog/[slug]`) pairs
 * that cover the same topic. Both pages emit `hreflang` alternates from this
 * one map so Google treats them as translations rather than two competing
 * pages. Guides with no Bengali counterpart (the tax/TIN trio) are simply
 * absent. Keep it in step when a slug is renamed on either side.
 */
export const LEARN_TO_BLOG: Record<string, string> = {
  "how-to-start-investing": "how-to-start-investing",
  "open-bo-account": "open-bo-account",
  "buy-sell-shares": "buy-sell-shares",
  "fundamental-analysis": "good-stock-key-numbers",
  "apply-for-ipo": "apply-for-ipo",
  "cash-vs-bonus-dividend": "cash-vs-bonus-dividend",
  "share-categories-explained": "share-categories",
  "floor-price-circuit-breaker": "floor-price-circuit-breaker",
  "dse-indices": "market-indices",
  "dividend-yield": "dividend-yield",
  "check-before-ipo": "is-this-ipo-worth-it",
  "read-financial-statements": "three-financial-reports",
  "read-annual-report": "read-annual-report",
  "understanding-sectors": "understand-sectors",
  "judge-a-bank-stock": "judge-a-bank-stock",
  "read-a-price-chart": "read-price-chart",
};

export const BLOG_TO_LEARN: Record<string, string> = Object.fromEntries(
  Object.entries(LEARN_TO_BLOG).map(([learn, blog]) => [blog, learn]),
);

/** `alternates.languages` for a guide. English is the x-default. */
export function guideLanguages(learnSlug: string): Record<string, string> | undefined {
  const blog = LEARN_TO_BLOG[learnSlug];
  if (!blog) return undefined;
  return { en: `/learn/${learnSlug}`, bn: `/blog/${blog}`, "x-default": `/learn/${learnSlug}` };
}

/** `alternates.languages` for a blog post. English is the x-default. */
export function blogLanguages(blogSlug: string): Record<string, string> | undefined {
  const learn = BLOG_TO_LEARN[blogSlug];
  if (!learn) return undefined;
  return { en: `/learn/${learn}`, bn: `/blog/${blogSlug}`, "x-default": `/learn/${learn}` };
}
