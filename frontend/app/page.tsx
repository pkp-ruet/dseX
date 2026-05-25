import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getScores,
  getMarketIndex,
  getPopularStocks,
  getTop20,
  getDailyPick,
  type ScoresResponse,
  type MarketIndexData,
  type PopularStocksResponse,
  type Top20Response,
  type DailyPickResponse,
} from "@/lib/api";
import SearchBar from "@/components/home/SearchBar";
import TickerBand from "@/components/home/TickerBand";
import TopRankings from "@/components/home/TopRankings";
import MarketIndexBanner from "@/components/home/MarketIndexBanner";
import NavHighlights from "@/components/home/NavHighlights";
import InsightsTeaserStrip from "@/components/home/InsightsTeaserStrip";
import PortfolioTeaserCTA from "@/components/home/PortfolioTeaserCTA";
import PopularTeaser from "@/components/home/PopularTeaser";
import Top20MomentumTeaser from "@/components/home/Top20MomentumTeaser";
import PortfolioAnalyzerHero from "@/components/home/PortfolioAnalyzerHero";
import GradeAnyStockHero from "@/components/home/GradeAnyStockHero";
import TodaysTopPicks from "@/components/home/TodaysTopPicks";
import HeroTeaserLine from "@/components/home/HeroTeaserLine";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "DSE Share Price Today | Dhaka Stock Exchange Rankings — TopStockBD",
  description:
    "Track DSE share price live, view Dhaka Stock Exchange (DSEX) rankings, Bangladesh stock market news, DSE share price list, and BD stock market signals. Free fundamental analysis for every DSE-listed stock.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "DSE Share Price Today | Dhaka Stock Exchange Rankings — TopStockBD",
    description: "Track DSE share price live, DSEX rankings, Bangladesh stock market news, and BD stock market signals — free.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Share Price Today | Dhaka Stock Exchange Rankings — TopStockBD",
    description: "Track DSE share price live, view Dhaka Stock Exchange (DSEX) rankings, Bangladesh stock market news, and DSE share price list — free.",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TopStockBD",
  url: process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com",
  description: "Track DSE share price today, Dhaka Stock Exchange (DSEX) live rankings, Bangladesh stock market news, DSE share price list, BD stock market signals, and DSE news — free fundamental analysis.",
  keywords: "DSE, DSEX, Dhaka Stock Exchange, DSE share price, DSE share price list, DSE today, DSE live, DSE news, Bangladesh stock market, share market Bangladesh, BD stock market",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com"}/stock/{search_term}`,
    },
    "query-input": "required name=search_term",
  },
};

function allItemsFromScores(scores: ScoresResponse) {
  return [
    ...scores.tiers.strong_buy,
    ...scores.tiers.safe_buy,
    ...scores.tiers.watch,
    ...scores.tiers.avoid,
  ];
}

async function TickerBandSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  if (!scores) return null;
  return <TickerBand items={allItemsFromScores(scores).slice(0, 100)} />;
}

async function MarketIndexSection({ promise }: { promise: Promise<MarketIndexData | null> }) {
  const data = await promise;
  if (!data) return null;
  return <MarketIndexBanner data={data} />;
}

async function PopularTeaserSection({
  promise,
}: {
  promise: Promise<PopularStocksResponse | null>;
}) {
  const data = await promise;
  if (!data || data.items.length === 0) return null;
  return <PopularTeaser items={data.items} />;
}

async function Top20TeaserSection({
  promise,
}: {
  promise: Promise<Top20Response | null>;
}) {
  const data = await promise;
  if (!data || data.items.length === 0) return null;
  return <Top20MomentumTeaser items={data.items} />;
}

/** New hero block: "Check any stock" + "Today's Top Stock" — 2 columns on desktop, stacked on mobile */
async function HeroBlock({
  scoresPromise,
  pickPromise,
}: {
  scoresPromise: Promise<ScoresResponse | null>;
  pickPromise: Promise<DailyPickResponse | null>;
}) {
  const [scores, pick] = await Promise.all([scoresPromise, pickPromise]);
  const allItems = scores ? allItemsFromScores(scores) : [];

  return (
    <section className="flex flex-col gap-4 sm:gap-5 mt-4 sm:mt-5">
      <GradeAnyStockHero items={allItems} />
      {pick ? (
        <TodaysTopPicks data={pick} />
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 p-5 flex items-center justify-center text-center text-sm text-[var(--text-muted)] min-h-[400px] sm:min-h-[440px]">
          Today&apos;s top picks are being prepared — check back in a moment.
        </div>
      )}
    </section>
  );
}

async function MainContentSection({
  scoresPromise,
  popularPromise,
  top20Promise,
}: {
  scoresPromise: Promise<ScoresResponse | null>;
  popularPromise: Promise<PopularStocksResponse | null>;
  top20Promise: Promise<Top20Response | null>;
}) {
  const scores = await scoresPromise;

  if (!scores) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        Unable to load rankings. Please try again shortly.
      </div>
    );
  }

  const allItems = allItemsFromScores(scores);
  const allCompanies = allItems.map((c) => ({
    trading_code: c.trading_code,
    company_name: c.company_name,
  }));

  return (
    <>
      <SearchBar companies={allCompanies} variant="sidebar" />
      <div className="home-layout mt-4 md:mt-6">
        <div className="home-main min-w-0">
          <Suspense>
            <TopRankings scores={allItems} />
          </Suspense>
          <PortfolioAnalyzerHero />
          <Suspense fallback={null}>
            <Top20TeaserSection promise={top20Promise} />
          </Suspense>
          <Suspense fallback={null}>
            <PopularTeaserSection promise={popularPromise} />
          </Suspense>
          <NavHighlights />
        </div>
      </div>
    </>
  );
}

export default function HomePage() {
  const scoresPromise = getScores().catch(() => null);
  const marketIndexPromise = getMarketIndex().catch(() => null);
  const popularPromise = getPopularStocks().catch(() => null);
  const top20Promise = getTop20().catch(() => null);
  const pickPromise = getDailyPick().catch(() => null);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Ticker — streams after scores; skeleton reserves exact 36px height */}
      <Suspense fallback={<div className="rounded-[10px] bg-[#0A1628] mb-3 h-9" />}>
        <TickerBandSection promise={scoresPromise} />
      </Suspense>

      {/* LCP candidate — static, in shell HTML immediately, no data dependency */}
      <h1 className="sr-only">DSE Share Price Today — Dhaka Stock Exchange Rankings</h1>
      <HeroTeaserLine />

      {/* Hero block — Grade-any-stock demo + Today's Top Stock */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-4 sm:gap-5 mt-4 sm:mt-5">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] min-h-[280px] animate-pulse" />
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] min-h-[260px] animate-pulse" />
          </div>
        }
      >
        <HeroBlock scoresPromise={scoresPromise} pickPromise={pickPromise} />
      </Suspense>

      {/* Market index banner — moved below the hero */}
      <div className="mt-3 sm:mt-4">
        <Suspense fallback={null}>
          <MarketIndexSection promise={marketIndexPromise} />
        </Suspense>
      </div>

      {/* Rankings — streams once data ready */}
      <Suspense fallback={<div className="py-16 text-center text-[var(--text-muted)] text-sm">Loading rankings…</div>}>
        <MainContentSection
          scoresPromise={scoresPromise}
          popularPromise={popularPromise}
          top20Promise={top20Promise}
        />
      </Suspense>

      <InsightsTeaserStrip />
      <PortfolioTeaserCTA />
    </>
  );
}
