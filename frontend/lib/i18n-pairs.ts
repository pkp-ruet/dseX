import { LESSON_EN_TO_BN } from "@/lib/learn/slugs";

/**
 * English guide (`/learn/[slug]`) ↔ Bengali blog post (`/blog/[slug]`) pairs
 * that cover the same topic. Both pages emit `hreflang` alternates from this
 * one map so Google treats them as translations rather than two competing
 * pages. Guides with no Bengali counterpart (the tax/TIN trio) are simply
 * absent. Keep it in step when a slug is renamed on either side.
 *
 * Since 2026-11-25 the lessons (`lib/learn/slugs.ts`) are added from their own
 * slug list, so every lesson is paired without an entry here.
 */
const OLD_POSTS: Record<string, string> = {
  "apply-for-ipo": "apply-for-ipo",
  "cash-vs-bonus-dividend": "cash-vs-bonus-dividend",
  "share-categories-explained": "share-categories",
  "floor-price-circuit-breaker": "floor-price-circuit-breaker",
  "dse-indices": "market-indices",
  "dividend-yield": "dividend-yield",
  "check-before-ipo": "is-this-ipo-worth-it",
  "read-financial-statements": "three-financial-reports",
  "read-a-price-chart": "read-price-chart",
};

export const LEARN_TO_BLOG: Record<string, string> = { ...OLD_POSTS, ...LESSON_EN_TO_BN };

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

/**
 * Where the navbar language switch should take a reader who is on an article
 * that exists in only one language: the guide's Bengali post (or back), the
 * guides hub ↔ the blog hub, and the Bengali daily market article → the market
 * analysis page. `null` = stay on this page (it switches in place, or it is an
 * unpaired article that shows a "only in …" note).
 */
export function pairedPath(pathname: string, to: "en" | "bn"): string | null {
  const m = /^\/(learn|blog)(?:\/([^/?#]+))?\/?$/.exec(pathname);
  if (m) {
    const [, section, slug] = m;
    if (to === "bn" && section === "learn") {
      if (!slug) return "/blog";
      return LEARN_TO_BLOG[slug] ? `/blog/${LEARN_TO_BLOG[slug]}` : null;
    }
    if (to === "en" && section === "blog") {
      if (!slug) return "/learn";
      return BLOG_TO_LEARN[slug] ? `/learn/${BLOG_TO_LEARN[slug]}` : null;
    }
    return null;
  }
  return null;
}
