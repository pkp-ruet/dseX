import type { Metadata } from "next";
import {
  flattenTiers,
  getScores,
  getTrust,
  getMarketState,
  getResearchLists,
  getScreenerGoals,
  getMarketMovers,
  getTodaysNews,
  getTop20,
  getDailyTips,
  type ScoresResponse,
  type ScoreItem,
  type TrustStats,
  type MarketStateData,
  type MarketMoversData,
  type DseTodayNewsItem,
  type Top20Item,
  type DailyTip,
  type ResearchListSummary,
  type ScreenerGoal,
} from "@/lib/api";
import { pickStoryStocks } from "@/lib/home-stories";
import { toLandingStock, pickHeroCode, type LandingStock } from "@/lib/landing";
import { buildLandingPortfolios } from "@/lib/landing-portfolio";
import HomePersonalizationGate from "@/components/home/HomePersonalizationGate";
import LandingHero from "@/components/landing/LandingHero";
import TrustStrip from "@/components/landing/TrustStrip";
import LiveToday from "@/components/landing/LiveToday";
import MarketToday from "@/components/landing/MarketToday";
import WorthALook from "@/components/landing/WorthALook";
import PortfolioCheck from "@/components/landing/PortfolioCheck";
import SignUpStrip from "@/components/landing/SignUpStrip";
import StartFromZero from "@/components/landing/StartFromZero";
import LandingClose from "@/components/landing/LandingClose";
import FeedbackSection from "@/components/feedback/FeedbackSection";
import FreeReportCard from "@/components/home/FreeReportCard";
import OfferBanner from "@/components/premium/OfferBanner";
import SectionHead from "@/components/i18n/SectionHead";
import { T } from "@/components/i18n/T";
import { freeReportCode } from "@/lib/free-report";

// Hourly, not daily: the page now renders today's movers, buy signals,
// trending and tips, so day-old HTML would show yesterday's market. Matches the
// 3600s the scores / market-state fetches below use.
export const revalidate = 3600;

export const metadata: Metadata = {
  // Root segment: the layout's "%s | TopStockBD" template only applies to child
  // segments, so this page has to carry the brand itself.
  title: "DSE Stock Analysis, Rankings & Share Price | TopStockBD",
  description:
    "Free fundamental analysis for every Dhaka Stock Exchange (DSE) company, in Bengali and English. See the score, the five checks behind it, and today's rankings before you buy. No tips, no rumours.",
  keywords: [
    "DSE stock analysis", "DSE share price", "Dhaka Stock Exchange rankings",
    "Bangladesh stock market analysis", "DSE fundamental analysis",
    "শেয়ার বাজার", "শেয়ার বাজার বিশ্লেষণ", "কোন শেয়ার কিনব",
    "ভালো শেয়ার চেনার উপায়", "ডিএসই শেয়ার দাম", "বাংলাদেশ শেয়ার বাজার",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "DSE Stock Analysis, Rankings & Share Price — TopStockBD",
    description:
      "Free fundamental scores for every DSE company, in Bengali and English. The score, the method behind it, and today's market — all free.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Stock Analysis, Rankings & Share Price — TopStockBD",
    description:
      "Free fundamental scores for every DSE company, in Bengali and English. No tips, no rumours.",
  },
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TopStockBD",
  url: BASE_URL,
  inLanguage: ["bn", "en"],
  description:
    "Free fundamental analysis, scores, rankings, watchlists and portfolio tracking for every Dhaka Stock Exchange (DSE) company, in Bengali and English.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/stock/{search_term}`,
    },
    "query-input": "required name=search_term",
  },
};

function sortedByScore(items: ScoreItem[]): ScoreItem[] {
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/** Round down to the nearest 50 so a headline count never over-claims. */
function safeCount(n: number): number {
  return Math.max(50, Math.floor(n / 50) * 50);
}

interface LandingData {
  stocks: LandingStock[];
  heroCode: string | null;
  total: number;
  sectors: number;
}

async function landingData(promise: Promise<ScoresResponse | null>): Promise<LandingData | null> {
  const scores = await promise;
  if (!scores) return null;
  const items = sortedByScore(flattenTiers(scores));
  if (items.length === 0) return null;
  const stocks = items.map(toLandingStock);
  return {
    stocks,
    heroCode: pickHeroCode(stocks),
    total: items.length,
    sectors: new Set(items.map((s) => s.sector).filter(Boolean)).size,
  };
}

// ---------------------------------------------------------------------------
// Blocks. Each awaits only the data it needs so a slow endpoint can't hold up
// the rest of the page.
// ---------------------------------------------------------------------------

async function HeroBlock({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const data = await landingData(promise);
  if (!data) return <HeroFallback />;
  return (
    <LandingHero
      stocks={data.stocks}
      initialCode={data.heroCode}
      totalCount={safeCount(data.total)}
    />
  );
}

async function TrustStripSection({
  scoresPromise,
  trustPromise,
}: {
  scoresPromise: Promise<ScoresResponse | null>;
  trustPromise: Promise<TrustStats | null>;
}) {
  const [data, trust] = await Promise.all([landingData(scoresPromise), trustPromise]);
  if (!data) return null;
  return <TrustStrip totalCount={safeCount(data.total)} sectorCount={data.sectors} trust={trust} />;
}

async function MarketTodaySection({
  moversPromise,
  newsPromise,
  marketPromise,
}: {
  moversPromise: Promise<MarketMoversData | null>;
  newsPromise: Promise<DseTodayNewsItem[] | null>;
  marketPromise: Promise<MarketStateData | null>;
}) {
  const [movers, news, market] = await Promise.all([moversPromise, newsPromise, marketPromise]);
  return (
    <MarketToday
      movers={movers}
      sectors={market?.now?.sectors ?? []}
      news={(news ?? []).slice(0, 12)}
      summaryBn={market?.summary_bn}
      summaryEn={market?.summary_en}
      next={market?.next ?? null}
    />
  );
}

async function WorthALookSection({
  scoresPromise,
  trendingPromise,
  tipsPromise,
  researchPromise,
  goalsPromise,
}: {
  scoresPromise: Promise<ScoresResponse | null>;
  trendingPromise: Promise<Top20Item[] | null>;
  tipsPromise: Promise<DailyTip[] | null>;
  researchPromise: Promise<ResearchListSummary[] | null>;
  goalsPromise: Promise<ScreenerGoal[] | null>;
}) {
  const [scores, trending, tips, research, goals] = await Promise.all([
    scoresPromise,
    trendingPromise,
    tipsPromise,
    researchPromise,
    goalsPromise,
  ]);
  return (
    <WorthALook
      stocks={scores ? sortedByScore(flattenTiers(scores)) : []}
      trending={trending ?? []}
      tips={tips ?? []}
      research={research}
      goals={goals}
    />
  );
}

async function LiveTodaySection({
  promise,
  marketPromise,
}: {
  promise: Promise<ScoresResponse | null>;
  marketPromise: Promise<MarketStateData | null>;
}) {
  const [scores, market] = await Promise.all([promise, marketPromise]);
  const items = scores ? sortedByScore(flattenTiers(scores)) : [];
  if (items.length === 0) return null;
  return (
    <LiveToday
      standouts={pickStoryStocks(items, items.length)}
      totalCount={safeCount(items.length)}
      mood={market?.mood ?? null}
    />
  );
}

/** 3b — today's free full report: one familiar company's page fully open,
 *  so a visitor sees the whole product before anyone asks them to pay. */
async function FreeReportSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  const code = freeReportCode();
  const item = scores ? flattenTiers(scores).find((s) => s.trading_code === code && s.score != null) : null;
  if (!item) return null;
  return (
    <section aria-labelledby="free-report-head">
      <SectionHead
        id="free-report-head"
        eyebrow={<T en="Free today" bn="আজ ফ্রি" />}
        title={<T en="Read one full report, free" bn="একটি পূর্ণ রিপোর্ট ফ্রি পড়ুন" />}
        sub={
          <T
            en="Each day, the full analysis of one well-known company is open to everyone. No account is needed."
            bn="প্রতিদিন একটি পরিচিত কোম্পানির পূর্ণ বিশ্লেষণ সবার জন্য খোলা। কোনো অ্যাকাউন্ট লাগবে না।"
          />
        }
      />
      <div className="mt-6 max-w-2xl">
        <FreeReportCard item={item} />
      </div>
    </section>
  );
}

async function PortfolioCheckSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  if (!scores) return null;
  // The real analysis engine on the two sample portfolios; any failure just
  // drops the section.
  let samples: ReturnType<typeof buildLandingPortfolios> = [];
  try {
    samples = buildLandingPortfolios(scores);
  } catch {
    return null;
  }
  if (samples.length === 0) return null;
  return <PortfolioCheck samples={samples} />;
}

async function CloseSection({ promise }: { promise: Promise<TrustStats | null> }) {
  const trust = await promise;
  return <LandingClose testimonials={trust?.testimonials ?? []} />;
}

function HeroFallback() {
  return (
    <section className="pt-6 sm:pt-10">
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1fr_minmax(0,26rem)] md:gap-12">
        <div className="flex flex-col gap-4">
          <div className="h-14 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-16 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-14 w-full animate-pulse rounded bg-surface-2" />
        </div>
        <div className="h-80 w-full animate-pulse rounded-2xl bg-surface-2" />
      </div>
    </section>
  );
}

/**
 * The logged-out landing page.
 *
 * One job: look like the most credible stock platform in Bangladesh. That
 * decides the shape — the first thing on screen is a real report rather than a
 * sales pitch, the method and its downward adjustments are published in full,
 * and there is no performance claim anywhere on the page because the product
 * doesn't make one.
 *
 * Language (2026-10-27): one language per page, chosen by the navbar switch
 * (Bengali for a first visit). Every line carries both languages through
 * `<T>` (components/i18n/T.tsx) and CSS shows one; voice per docs/voice.md.
 *
 * Order was corrected three times. The first cut buried the product under two
 * sections of trust-and-method prose; both were deleted. The second cut put the
 * four core features (rankings, portfolio, watchlist, alerts) at block 3, which
 * still described the product rather than running it. So as of 2026-09-16 the
 * page shows the market instead of talking about it: today's movers, sectors,
 * news and the Bangla snapshot at block 4, then buy signals, the ranking,
 * trending, the ready-made lists, tips and what others are reading at block 5 —
 * the very cards the signed-in dashboard uses, fed from public endpoints.
 *
 * Deleted to make room, and not to be written back as prose: `ReportAnatomy`
 * (block 6, a list of the eight sections on a stock page) and `WaysToFind`
 * (block 5, a picker plus a row of links). `CoreFeatures` shrank to
 * `SignUpStrip` and moved *below* the data — the ask comes after the proof now,
 * and only has to answer "what changes if I sign in?". The written-out method
 * lives on `/about`, linked from the footer on every page. Do not put it back
 * on this page.
 *
 * `HomePersonalizationGate` swaps the whole thing for the dashboard once a user
 * is signed in; crawlers and first paint always get this markup.
 */
export default function HomePage() {
  // Every request is fired here and awaited inside the block that needs it, so
  // they overlap. Each one degrades to null on its own — a dead endpoint drops
  // its card, never the page. No Suspense and no loading.tsx: this route has to
  // return finished HTML with a real status code (see the SEO rules).
  const scoresPromise = getScores().catch(() => null);
  const trustPromise = getTrust().catch(() => null);
  // Carries the mood sentence (block 3), the sector rows and Bangla snapshot
  // (block 4). Fetched at the same 3600s as
  // the scores so this page's ISR cadence doesn't tighten to 15 minutes.
  const marketPromise = getMarketState(3600).catch(() => null);
  const moversPromise = getMarketMovers().catch(() => null);
  // 3600, not the helper's 900: the shortest fetch TTL sets the page's real
  // cadence, and 900 quietly made `/` rebuild every 15 minutes.
  const newsPromise = getTodaysNews(3600).catch(() => null);
  const trendingPromise = getTop20()
    .then((d) => d.items)
    .catch(() => null);
  const tipsPromise = getDailyTips()
    .then((d) => d.tips)
    .catch(() => null);
  // The six research lists — counts only on this page (visitors aren't Premium).
  const researchPromise = getResearchLists()
    .then((d) => d.lists)
    .catch(() => null);
  // The screener's goal starts — counts + top three, all free.
  const goalsPromise = getScreenerGoals()
    .then((d) => d.goals)
    .catch(() => null);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* The reader's own ৳99 month — client-only, above both the landing and
          the dashboard; nothing in the server HTML. */}
      <OfferBanner />

      <HomePersonalizationGate>
        {/* 1 — the claim and its proof, side by side */}
        <HeroBlock promise={scoresPromise} />

        {/* 2 — credibility + the colour key as ONE band, not a wall of prose.
            There is no long-form version of this argument anywhere on the
            page; the blocks below make the case by running. */}
        <div className="mt-8 sm:mt-10">
          <TrustStripSection scoresPromise={scoresPromise} trustPromise={trustPromise} />
        </div>

        <div className="mt-14 flex flex-col gap-16 sm:mt-16 sm:gap-24">
          {/* 3 — the market's mood in one plain sentence (the door to
              /market-analysis), then the three companies today's numbers
              single out */}
          <LiveTodaySection promise={scoresPromise} marketPromise={marketPromise} />

          {/* 3b — today's free full report (one stock page fully open) */}
          <FreeReportSection promise={scoresPromise} />

          {/* 4 — the day itself: movers, sectors this week, today's headlines,
              and the Bangla paragraph */}
          <MarketTodaySection
            moversPromise={moversPromise}
            newsPromise={newsPromise}
            marketPromise={marketPromise}
          />

          {/* 5 — every way in that needs no account: buy signals, the top of
              the ranking, trending, tips, the screener's goals — and the
              research lists (Premium) */}
          <WorthALookSection
            scoresPromise={scoresPromise}
            trendingPromise={trendingPromise}
            tipsPromise={tipsPromise}
            researchPromise={researchPromise}
            goalsPromise={goalsPromise}
          />

          {/* 5b — the portfolio check: what it does in four steps, beside the
              real engine run on two sample portfolios */}
          <PortfolioCheckSection promise={scoresPromise} />

          {/* 6 — the ask, after the proof: what an account adds */}
          <SignUpStrip />

          {/* 7 — the door that starts at zero */}
          <StartFromZero />

          {/* 8 — real reviews, then one ask */}
          <CloseSection promise={trustPromise} />
        </div>
      </HomePersonalizationGate>

      {/* Shown to everyone, signed in or not, just above the footer */}
      <div className="mt-16 sm:mt-24">
        <FeedbackSection />
      </div>
    </>
  );
}
