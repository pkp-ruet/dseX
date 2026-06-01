import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getScores,
  getMarketIndex,
  getMarketMovers,
  getCompanyDetail,
  getTop20,
  getPopularStocks,
  type ScoresResponse,
  type ScoreItem,
  type MarketIndexData,
  type MarketMoversData,
  type CompanyDetail,
  type Top20Response,
  type PopularStocksResponse,
} from "@/lib/api";
import HomeHero from "@/components/home/HomeHero";
import LiveMarketBand from "@/components/home/LiveMarketBand";
import FeatureShowcase from "@/components/home/FeatureShowcase";
import DataScaleStats from "@/components/home/DataScaleStats";
import FinalCTA from "@/components/home/FinalCTA";
import HomePersonalizationGate from "@/components/home/HomePersonalizationGate";
import Top20MomentumTeaser from "@/components/home/Top20MomentumTeaser";
import PopularTeaser from "@/components/home/PopularTeaser";
import InsightsTeaserStrip from "@/components/home/InsightsTeaserStrip";
import SearchBar from "@/components/home/SearchBar";
import StockListPreview from "@/components/home/StockListPreview";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "DSE Stock Analysis, Rankings & Share Price — TopStockBD",
  description:
    "Free fundamental analysis for every Dhaka Stock Exchange (DSE) company. Score, rank, watch and track DSE stocks — find what's worth owning, plus live DSEX rankings and Bangladesh stock market data.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "DSE Stock Analysis, Rankings & Share Price — TopStockBD",
    description:
      "Free fundamental scores, rankings, watchlists and portfolio tracking for every Dhaka Stock Exchange stock.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Stock Analysis, Rankings & Share Price — TopStockBD",
    description:
      "Free fundamental scores, rankings, watchlists and portfolio tracking for every Dhaka Stock Exchange stock.",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TopStockBD",
  url: process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com",
  description:
    "Free fundamental analysis, scores, rankings, watchlists and portfolio tracking for every Dhaka Stock Exchange (DSE) company.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com"}/stock/{search_term}`,
    },
    "query-input": "required name=search_term",
  },
};

function allItemsFromScores(scores: ScoresResponse): ScoreItem[] {
  return [
    ...scores.tiers.strong_buy,
    ...scores.tiers.safe_buy,
    ...scores.tiers.watch,
    ...scores.tiers.avoid,
  ];
}

function sortedByScore(items: ScoreItem[]): ScoreItem[] {
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

async function HeroSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  if (!scores) return <HeroFallback />;
  const top = sortedByScore(allItemsFromScores(scores));
  return <HomeHero topItems={top} />;
}

async function MarketSection({
  indexPromise,
  moversPromise,
}: {
  indexPromise: Promise<MarketIndexData | null>;
  moversPromise: Promise<MarketMoversData | null>;
}) {
  const [index, movers] = await Promise.all([indexPromise, moversPromise]);
  if (!index) return null;
  return <LiveMarketBand index={index} gainers={movers?.gainers ?? []} />;
}

async function ShowcaseSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  if (!scores) return null;
  const all = sortedByScore(allItemsFromScores(scores));
  const total = all.length;
  const sectorCount = new Set(all.map((s) => s.sector).filter(Boolean)).size;

  // Pick a strong, well-known top stock and pull its full detail (verdict + key numbers)
  const sampleCode = (all.find((s) => s.score != null) ?? all[0])?.trading_code;
  const sampleDetail: CompanyDetail | null = sampleCode
    ? await getCompanyDetail(sampleCode).catch(() => null)
    : null;

  return (
    <>
      <FeatureShowcase sampleDetail={sampleDetail} rankingItems={all} totalCount={total} />
      <DataScaleStats totalCount={total} sectorCount={sectorCount} />
    </>
  );
}

async function SearchSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  if (!scores) return null;
  const companies = allItemsFromScores(scores).map((s) => ({
    trading_code: s.trading_code,
    company_name: s.company_name,
  }));
  if (companies.length === 0) return null;
  return (
    <section className="soft-card px-5 sm:px-7 py-6 sm:py-7">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--primary-ink)]">Explore · Free</p>
      <h2 className="font-display mt-1.5 mb-4 text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
        Look up any DSE stock
      </h2>
      <SearchBar companies={companies} variant="sidebar" />
    </section>
  );
}

async function DiscoverSection({
  scoresPromise,
  top20Promise,
  popularPromise,
}: {
  scoresPromise: Promise<ScoresResponse | null>;
  top20Promise: Promise<Top20Response | null>;
  popularPromise: Promise<PopularStocksResponse | null>;
}) {
  const [scores, top20, popular] = await Promise.all([scoresPromise, top20Promise, popularPromise]);
  const allStocks = scores ? allItemsFromScores(scores) : [];
  const top20Items = top20?.items ?? [];
  const popularItems = popular?.items ?? [];
  return (
    <div className="flex flex-col gap-10">
      {top20Items.length > 0 && <Top20MomentumTeaser items={top20Items} />}
      {popularItems.length > 0 && <PopularTeaser items={popularItems} />}
      {allStocks.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-medium mb-3">
            Browse stocks (A–Z)
          </p>
          <StockListPreview items={allStocks} totalCount={allStocks.length} />
        </div>
      )}
      <InsightsTeaserStrip />
    </div>
  );
}

function HeroFallback() {
  return (
    <section className="pt-6 sm:pt-10 pb-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col gap-4">
          <div className="h-6 w-64 rounded bg-[var(--surface-2)] animate-pulse" />
          <div className="h-14 w-full rounded bg-[var(--surface-2)] animate-pulse" />
          <div className="h-20 w-full rounded bg-[var(--surface-2)] animate-pulse" />
          <div className="h-12 w-48 rounded bg-[var(--surface-2)] animate-pulse" />
        </div>
        <div className="h-72 w-full rounded-2xl bg-[var(--surface-2)] animate-pulse" />
      </div>
    </section>
  );
}

export default function HomePage() {
  const scoresPromise = getScores().catch(() => null);
  const marketIndexPromise = getMarketIndex().catch(() => null);
  const moversPromise = getMarketMovers().catch(() => null);
  const top20Promise = getTop20().catch(() => null);
  const popularPromise = getPopularStocks().catch(() => null);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <HomePersonalizationGate>
        <Suspense fallback={<HeroFallback />}>
          <HeroSection promise={scoresPromise} />
        </Suspense>

        <div className="mt-6 sm:mt-8">
          <Suspense fallback={null}>
            <SearchSection promise={scoresPromise} />
          </Suspense>
        </div>

        <div className="mt-4 sm:mt-5">
          <Suspense fallback={<div className="h-40 rounded-2xl bg-[var(--surface-2)] animate-pulse" />}>
            <MarketSection indexPromise={marketIndexPromise} moversPromise={moversPromise} />
          </Suspense>
        </div>

        <div className="mt-16 sm:mt-24 flex flex-col gap-16 sm:gap-24">
          <Suspense fallback={<div className="py-16 text-center text-[var(--text-muted)] text-sm">Loading…</div>}>
            <ShowcaseSection promise={scoresPromise} />
          </Suspense>

          <Suspense fallback={null}>
            <DiscoverSection scoresPromise={scoresPromise} top20Promise={top20Promise} popularPromise={popularPromise} />
          </Suspense>

          <FinalCTA />
        </div>
      </HomePersonalizationGate>
    </>
  );
}
