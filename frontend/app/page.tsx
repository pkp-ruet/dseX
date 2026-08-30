import type { Metadata } from "next";
import { Suspense } from "react";
import {
  flattenTiers,
  getScores,
  getTrust,
  type ScoresResponse,
  type ScoreItem,
  type TrustStats,
} from "@/lib/api";
import { pickStoryStocks } from "@/lib/home-stories";
import { toLandingStock, pickHeroCode, type LandingStock } from "@/lib/landing";
import HomePersonalizationGate from "@/components/home/HomePersonalizationGate";
import LandingHero from "@/components/landing/LandingHero";
import TrustStrip from "@/components/landing/TrustStrip";
import CoreFeatures from "@/components/landing/CoreFeatures";
import ReportAnatomy from "@/components/landing/ReportAnatomy";
import LiveToday from "@/components/landing/LiveToday";
import WaysToFind from "@/components/landing/WaysToFind";
import StartFromZero from "@/components/landing/StartFromZero";
import LandingClose from "@/components/landing/LandingClose";
import FeedbackSection from "@/components/feedback/FeedbackSection";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "DSE Stock Analysis, Rankings & Share Price — TopStockBD",
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

async function CoreFeaturesSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  const items = scores ? sortedByScore(flattenTiers(scores)) : [];
  if (items.length === 0) return null;
  return <CoreFeatures items={items} totalCount={safeCount(items.length)} />;
}

async function AnatomySection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const data = await landingData(promise);
  if (!data) return null;
  const hero = data.heroCode ? data.stocks.find((s) => s.code === data.heroCode) ?? null : null;
  return <ReportAnatomy stock={hero} totalCount={safeCount(data.total)} />;
}

async function LiveTodaySection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  const items = scores ? sortedByScore(flattenTiers(scores)) : [];
  if (items.length === 0) return null;
  return (
    <LiveToday
      standouts={pickStoryStocks(items, items.length)}
      totalCount={safeCount(items.length)}
    />
  );
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
          <div className="h-14 w-full animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-16 w-full animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-14 w-full animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
        <div className="h-80 w-full animate-pulse rounded-2xl bg-[var(--surface-2)]" />
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
 * Language: there is no toggle. Every headline is English in easy words with one
 * simple Bengali line under it (components/i18n/SectionHead.tsx for section
 * heads, components/i18n/Bn.tsx for a Bengali line anywhere else). Small UI text
 * — chips, buttons, table headers, metric labels — stays English only.
 *
 * Order matters and was corrected twice: the four core features (rankings,
 * portfolio, watchlist, alerts) sit at block 3, straight after a thin trust
 * strip, because the first cut buried them under two full sections of
 * trust-and-method prose. Both of those prose sections have since been cut
 * entirely — the credibility signal that survives is the strip at block 2, the
 * real report in the hero, and the five checks shown inside it. The written-out
 * method lives on `/about`, linked from the footer on every page. Do not put it
 * back on this page.
 *
 * `HomePersonalizationGate` swaps the whole thing for the dashboard once a user
 * is signed in; crawlers and first paint always get this markup.
 */
export default function HomePage() {
  const scoresPromise = getScores().catch(() => null);
  const trustPromise = getTrust().catch(() => null);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <HomePersonalizationGate>
        {/* 1 — the claim and its proof, side by side */}
        <Suspense fallback={<HeroFallback />}>
          <HeroBlock promise={scoresPromise} />
        </Suspense>

        {/* 2 — credibility as a thin strip, not a wall of prose. The long-form
            version of this argument is block 6, far enough down that it can't
            stand between a visitor and the product. */}
        <div className="mt-8 sm:mt-10">
          <Suspense fallback={null}>
            <TrustStripSection scoresPromise={scoresPromise} trustPromise={trustPromise} />
          </Suspense>
        </div>

        <div className="mt-14 flex flex-col gap-16 sm:mt-16 sm:gap-24">
          {/* 3 — the four things people come for: rankings, portfolio,
              watchlist, alerts. High on the page, by design. */}
          <Suspense fallback={null}>
            <CoreFeaturesSection promise={scoresPromise} />
          </Suspense>

          {/* 4 — today's data, so nothing above is only a claim */}
          <Suspense fallback={null}>
            <LiveTodaySection promise={scoresPromise} />
          </Suspense>

          {/* 5 — more routes in, for someone with no company in mind */}
          <WaysToFind />

          {/* 6 — how deep one company's page goes */}
          <Suspense fallback={null}>
            <AnatomySection promise={scoresPromise} />
          </Suspense>

          {/* 7 — the door that starts at zero */}
          <StartFromZero />

          {/* 8 — real reviews, then one ask */}
          <Suspense fallback={null}>
            <CloseSection promise={trustPromise} />
          </Suspense>
        </div>
      </HomePersonalizationGate>

      {/* Shown to everyone, signed in or not, just above the footer */}
      <div className="mt-16 sm:mt-24">
        <FeedbackSection />
      </div>
    </>
  );
}
