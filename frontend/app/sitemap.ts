import type { MetadataRoute } from "next";
import {
  flattenTiers,
  getAllCodes,
  getDeepAnalysisCodes,
  getMarketIndex,
  getScores,
  getSectorSlugs,
} from "@/lib/api";
import { GUIDES } from "@/lib/guides";
import { BLOG_POSTS } from "@/lib/blog-bn";
import { STOCK_LISTS } from "@/lib/stock-lists";
import { SAMPLE_SLUGS } from "@/lib/sample-portfolios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const revalidate = 86400;

type Entry = MetadataRoute.Sitemap[number];
type Freq = NonNullable<Entry["changeFrequency"]>;

/**
 * `lastModified` policy (2026-09-15): it used to be `new Date()` on every URL,
 * which tells Google every page changed every day — it learns to ignore the
 * field, and the 400+ daily stock URLs burned crawl budget. Now:
 *  - data pages carry the latest trading date (the day the numbers on them
 *    last changed);
 *  - hand-written content (guides, blog, legal) carries no lastModified at all
 *    rather than a fake one.
 * Only indexable URLs belong here: login/register are `noindex`, and stock
 * pages without a DSEF score (mutual funds, bonds) are `noindex` too.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [scores, allCodes, analysisCodes, sectorSlugs, marketIndex] = await Promise.all([
    getScores().catch(() => null),
    getAllCodes().catch(() => [] as string[]),
    getDeepAnalysisCodes().catch(() => [] as string[]),
    getSectorSlugs().catch(() => [] as string[]),
    getMarketIndex().catch(() => null),
  ]);

  // The day the market data last changed — DSE's latest trading date. Falls
  // back to today only when the backend didn't answer.
  const dataDate = marketIndex?.date ? new Date(`${marketIndex.date}T09:00:00Z`) : new Date();
  const lastModified = Number.isNaN(dataDate.getTime()) ? new Date() : dataDate;

  // Stock pages: only codes that have a fundamental score. If the scores call
  // failed, fall back to every code rather than publishing an empty stock set
  // for a day.
  const scoredCodes = scores
    ? flattenTiers(scores)
        .filter((r) => r.score != null)
        .map((r) => r.trading_code)
    : allCodes;
  const stockCodes = Array.from(new Set(scoredCodes)).sort();

  const data = (path: string, changeFrequency: Freq, priority: number): Entry => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });
  const content = (path: string, changeFrequency: Freq, priority: number): Entry => ({
    url: `${BASE_URL}${path}`,
    changeFrequency,
    priority,
  });

  const sectorPages = sectorSlugs.map((slug) => data(`/sector/${slug}`, "daily", 0.8));
  const stockPages = stockCodes.map((code) => data(`/stock/${code}`, "daily", 0.8));
  // In-depth analysis sub-pages — only codes that actually have a report.
  const analysisPages = analysisCodes.map((code) => content(`/stock/${code}/analysis`, "weekly", 0.75));
  const guidePages = GUIDES.map((g) => content(`/learn/${g.slug}`, "monthly", 0.7));
  const blogPages = BLOG_POSTS.map((p) => content(`/blog/${p.slug}`, "monthly", 0.7));
  const stockListPages = STOCK_LISTS.map((l) => data(`/stock-insights/${l.slug}`, "daily", 0.8));
  const samplePortfolioPages = SAMPLE_SLUGS.map((slug) => content(`/sample-portfolio/${slug}`, "weekly", 0.7));

  return [
    data("", "daily", 1.0),
    data("/dsestockranking", "daily", 0.9),
    data("/buy-sell-signals", "daily", 0.9),
    data("/stocks", "daily", 0.85),
    data("/market-analysis", "daily", 0.85),
    data("/dse-today", "daily", 0.85),
    data("/share-bazar", "daily", 0.9),
    data("/todays-news", "daily", 0.8),
    data("/dse-popular-stocks", "daily", 0.85),
    data("/dse-trending-stocks", "daily", 0.9),
    data("/top-picks", "daily", 0.9),
    data("/daily-tips", "daily", 0.85),
    data("/dividend-calendar", "daily", 0.85),
    data("/sectors", "daily", 0.85),
    data("/stock-insights", "weekly", 0.85),
    content("/stock-recommendation", "monthly", 0.7),
    content("/assistant", "monthly", 0.6),
    content("/learn", "monthly", 0.8),
    content("/blog", "monthly", 0.8),
    content("/about", "yearly", 0.3),
    content("/contact", "yearly", 0.3),
    content("/privacy-policy", "yearly", 0.3),
    content("/disclaimer", "yearly", 0.3),
    ...sectorPages,
    ...samplePortfolioPages,
    ...stockListPages,
    ...guidePages,
    ...blogPages,
    ...stockPages,
    ...analysisPages,
  ];
}
