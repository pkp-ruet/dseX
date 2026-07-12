import type { Metadata } from "next";
import { Suspense } from "react";
import {
  flattenTiers,
  getScores,
  getMarketIndex,
  getMarketMovers,
  getCompanyDetail,
  getTop20,
  type ScoresResponse,
  type ScoreItem,
  type MarketIndexData,
  type MarketMoversData,
  type Top20Response,
  type StockSignalInfo,
} from "@/lib/api";
import { getTier, TIER_MEANINGS_BN } from "@/lib/constants";
import HomeHero from "@/components/home/HomeHero";
import { type HeroStock } from "@/components/home/HeroGradeReveal";
import LearnPromoCard from "@/components/home/LearnPromoCard";
import SignupSlideshow from "@/components/home/SignupSlideshow";
import RankingPromo from "@/components/home/RankingPromo";
import FinalCTA from "@/components/home/FinalCTA";
import HomePersonalizationGate from "@/components/home/HomePersonalizationGate";
import ExploreMore from "@/components/home/ExploreMore";
import LiveMarketBand from "@/components/home/LiveMarketBand";
import HowItWorks from "@/components/home/HowItWorks";
import StatsCountUp from "@/components/home/StatsCountUp";
import FeedbackSection from "@/components/feedback/FeedbackSection";
import MotionProvider from "@/components/motion/MotionProvider";
import Reveal from "@/components/ui/Reveal";

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
  return flattenTiers(scores);
}

function sortedByScore(items: ScoreItem[]): ScoreItem[] {
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/** One demo card for the hero. Prefer stocks that carry a Buy signal (strong
 *  first). Signals ride on the /api/scores payload; when they don't, we enrich
 *  the top names from company detail (authoritative source). */
async function buildHeroStocks(all: ScoreItem[]): Promise<HeroStock[]> {
  const scored = all.filter((s) => s.score != null);
  if (scored.length === 0) return [];

  const make = (s: ScoreItem, sig: StockSignalInfo | null): HeroStock => {
    const tier = getTier(s.score);
    const isBuy = sig?.signal === "buy";
    return {
      code: s.trading_code,
      name: s.company_name ?? s.trading_code,
      sector: s.sector,
      score: s.score as number,
      tier,
      signal: isBuy ? "buy" : "none",
      strength: isBuy ? sig?.strength ?? "normal" : null,
      reasonBn: (isBuy ? sig?.reason_bn : null) || TIER_MEANINGS_BN[tier],
      ltp: s.ltp,
      changePct: s.change_pct,
    };
  };

  // Fast path — the scores payload already carries the signal.
  const buysInline = scored.filter((s) => s.signal?.signal === "buy");
  if (buysInline.length >= 3) {
    return buysInline.slice(0, 3).map((s) => make(s, s.signal ?? null));
  }

  // Fallback — enrich the top names with the authoritative signal from detail.
  const probe = scored.slice(0, 6);
  const details = await Promise.all(
    probe.map((s) => getCompanyDetail(s.trading_code).catch(() => null)),
  );
  const candidates = probe.map((s, i) => make(s, details[i]?.signal ?? s.signal ?? null));
  const buys = candidates
    .filter((c) => c.signal === "buy")
    .sort(
      (a, b) =>
        (a.strength === "strong" ? 0 : 1) - (b.strength === "strong" ? 0 : 1) ||
        b.score - a.score,
    );
  const rest = candidates.filter((c) => c.signal !== "buy");
  return [...buys, ...rest].slice(0, 3);
}

async function HeroSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  if (!scores) return <HeroFallback />;
  const top = sortedByScore(allItemsFromScores(scores));
  const heroStocks = await buildHeroStocks(top);
  return <HomeHero topItems={top} heroStocks={heroStocks} />;
}

async function RankingPromoSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  if (!scores) return null;
  const all = sortedByScore(allItemsFromScores(scores));
  if (all.length === 0) return null;
  return <RankingPromo items={all} totalCount={all.length} />;
}

async function MarketPulseSection({ promise }: { promise: Promise<MarketIndexData | null> }) {
  const index = await promise;
  if (!index) return null;
  return <LiveMarketBand index={index} />;
}

async function StatsSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  if (!scores) return null;
  const all = allItemsFromScores(scores);
  const total = Math.max(50, Math.floor(all.length / 50) * 50);
  const sectorCount = new Set(all.map((s) => s.sector).filter(Boolean)).size;
  return <StatsCountUp totalCount={total} sectorCount={sectorCount} />;
}

async function DiscoverSection({
  scoresPromise,
  top20Promise,
  indexPromise,
  moversPromise,
}: {
  scoresPromise: Promise<ScoresResponse | null>;
  top20Promise: Promise<Top20Response | null>;
  indexPromise: Promise<MarketIndexData | null>;
  moversPromise: Promise<MarketMoversData | null>;
}) {
  const [scores, top20, index, movers] = await Promise.all([
    scoresPromise,
    top20Promise,
    indexPromise,
    moversPromise,
  ]);
  const allStocks = scores ? sortedByScore(allItemsFromScores(scores)) : [];
  const top20Items = top20?.items ?? [];
  return (
    <ExploreMore
      top20={top20Items}
      totalStocks={allStocks.length}
      index={index}
      movers={movers}
    />
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <MotionProvider>
      <HomePersonalizationGate>
        <Suspense fallback={<HeroFallback />}>
          <HeroSection promise={scoresPromise} />
        </Suspense>

        {/* Live DSE pulse — right under the hero: "real data, updated daily" */}
        <Reveal className="block mt-6 sm:mt-8" y={12}>
          <Suspense fallback={null}>
            <MarketPulseSection promise={marketIndexPromise} />
          </Suspense>
        </Reveal>

        <div className="mt-12 sm:mt-16 flex flex-col gap-16 sm:gap-24">
          {/* Rankings hub — right under the live market band */}
          <Reveal>
            <Suspense fallback={null}>
              <RankingPromoSection promise={scoresPromise} />
            </Suspense>
          </Reveal>

          {/* Self-reveals its header + staggered step cards */}
          <HowItWorks />

          {/* What you unlock with a free account — auto-advancing slideshow */}
          <Reveal>
            <SignupSlideshow />
          </Reveal>

          <Reveal>
            <Suspense fallback={null}>
              <StatsSection promise={scoresPromise} />
            </Suspense>
          </Reveal>

          <Reveal>
            <Suspense fallback={null}>
              <DiscoverSection
                scoresPromise={scoresPromise}
                top20Promise={top20Promise}
                indexPromise={marketIndexPromise}
                moversPromise={moversPromise}
              />
            </Suspense>
          </Reveal>

          {/* Bengali "learn from scratch" entry */}
          <Reveal>
            <LearnPromoCard />
          </Reveal>

          <Reveal>
            <FinalCTA />
          </Reveal>
        </div>
      </HomePersonalizationGate>

      {/* Feedback band — shown to everyone (logged-in or out), just before the footer */}
      <div className="mt-16 sm:mt-24">
        <Reveal>
          <FeedbackSection />
        </Reveal>
      </div>
      </MotionProvider>
    </>
  );
}
