import type { Metadata } from "next";
import {
  flattenTiers,
  getScores,
  getTrust,
  getMarketState,
  getMarketMovers,
  type ScoresResponse,
  type ScoreItem,
  type TrustStats,
  type MarketStateData,
  type MarketMoversData,
} from "@/lib/api";
import { toLandingStock, pickHeroCode, pickQuickCodes, type LandingStock } from "@/lib/landing";
import { buildLandingPortfolios, type SampleView } from "@/lib/landing-portfolio";
import HomePersonalizationGate from "@/components/home/HomePersonalizationGate";
import LandingHero, { type HeroDividend } from "@/components/landing/LandingHero";
import TrustStrip from "@/components/landing/TrustStrip";
import WhatWeDo from "@/components/landing/WhatWeDo";
import MarketPulse from "@/components/landing/MarketPulse";
import SignUpBand from "@/components/landing/SignUpBand";
import StartFromZero from "@/components/landing/StartFromZero";
import LandingClose from "@/components/landing/LandingClose";
import FeedbackSection from "@/components/feedback/FeedbackSection";
import OfferBanner from "@/components/premium/OfferBanner";
import { freeReportCode } from "@/lib/free-report";

// Hourly, not daily: the page renders today's movers and Buy signals, so
// day-old HTML would show yesterday's market. Matches the 3600s the scores /
// market-state fetches below use.
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
}

async function landingData(promise: Promise<ScoresResponse | null>): Promise<LandingData | null> {
  const scores = await promise;
  if (!scores) return null;
  const items = sortedByScore(flattenTiers(scores));
  if (items.length === 0) return null;
  const stocks = items.map(toLandingStock);
  return { stocks, heroCode: pickHeroCode(stocks), total: items.length };
}

/** The next cash record date that can still be bought into — the hero's
 *  "what an account tells you" card. */
function nextDividend(market: MarketStateData | null): HeroDividend | null {
  const ev = (market?.next?.dividends ?? [])
    .filter((d) => d.kind === "record" && (d.cash_per_share ?? 0) > 0 && (d.buy_days_left ?? 0) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!ev || ev.cash_per_share == null) return null;
  return { code: ev.trading_code, cashPerShare: ev.cash_per_share, buyBy: ev.buy_by ?? null };
}

// ---------------------------------------------------------------------------
// Blocks. Each awaits only the data it needs so a slow endpoint can't hold up
// the rest of the page.
// ---------------------------------------------------------------------------

async function HeroBlock({
  promise,
  marketPromise,
}: {
  promise: Promise<ScoresResponse | null>;
  marketPromise: Promise<MarketStateData | null>;
}) {
  const [data, market] = await Promise.all([landingData(promise), marketPromise]);
  if (!data) return <HeroFallback />;
  const free = freeReportCode();
  return (
    <LandingHero
      stocks={data.stocks}
      initialCode={data.heroCode}
      freeCode={data.stocks.some((s) => s.code === free && s.score != null) ? free : null}
      dividend={nextDividend(market)}
    />
  );
}

async function TrustStripSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const data = await landingData(promise);
  if (!data) return null;
  return <TrustStrip totalCount={safeCount(data.total)} />;
}

async function WhatWeDoSection({ promise }: { promise: Promise<ScoresResponse | null> }) {
  const scores = await promise;
  const data = await landingData(promise);
  if (!scores || !data) return null;
  // The first card shows a familiar company other than the hero's.
  const questionStock = pickQuickCodes(data.stocks, 4).find((s) => s.code !== data.heroCode) ?? null;
  const buys = data.stocks.filter((s) => s.sig === "buy").slice(0, 3);
  // The real portfolio check on the well-spread sample; any failure just
  // leaves the third card without its picture.
  let sample: SampleView | null = null;
  try {
    sample = buildLandingPortfolios(scores).find((p) => p.slug === "diversified") ?? null;
  } catch {
    sample = null;
  }
  return <WhatWeDo questionStock={questionStock} buys={buys} sample={sample} />;
}

async function MarketSection({
  marketPromise,
  moversPromise,
}: {
  marketPromise: Promise<MarketStateData | null>;
  moversPromise: Promise<MarketMoversData | null>;
}) {
  const [market, movers] = await Promise.all([marketPromise, moversPromise]);
  return <MarketPulse market={market} movers={movers} />;
}

async function SignUpSection({ promise }: { promise: Promise<TrustStats | null> }) {
  const trust = await promise;
  return <SignUpBand trust={trust} />;
}

async function CloseSection({ promise }: { promise: Promise<TrustStats | null> }) {
  const trust = await promise;
  return <LandingClose testimonials={trust?.testimonials ?? []} />;
}

function HeroFallback() {
  return (
    <section className="pt-8 sm:pt-14">
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1fr_minmax(0,27rem)] md:gap-12">
        <div className="flex flex-col gap-4">
          <div className="h-14 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-16 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-14 w-full animate-pulse rounded bg-surface-2" />
        </div>
        <div className="h-96 w-full animate-pulse rounded-3xl bg-surface-2" />
      </div>
    </section>
  );
}

/**
 * The logged-out landing page (rebuilt 2026-10-31, user: "unorganized and lots
 * of things … redesign so a user easily understands what this site is about
 * and feels the urge to sign up"; mockup
 * https://claude.ai/artifact/FBCjsKoN5cKYXC5q6S8pzT).
 *
 * Seven blocks, one job each: 1 hero (the promise, the ask, a lookup that
 * needs no account, and a real answer card) · 2 four plain facts · 3 what the
 * site does, as three jobs with a real piece of each · 4 today on the DSE in
 * one card · 5 the sign-up band with the form on the page · 6 three guides
 * for a beginner · 7 reviews and one last ask. No pricing and no offer on this
 * page; no performance claim anywhere.
 *
 * Language: one language per page, chosen by the navbar switch (Bengali for a
 * first visit). Every line carries both languages through `<T>`.
 *
 * `HomePersonalizationGate` swaps the whole thing for the dashboard once a user
 * is signed in; crawlers and first paint always get this markup.
 */
export default function HomePage() {
  // Every request is fired here and awaited inside the block that needs it, so
  // they overlap. Each one degrades to null on its own — a dead endpoint drops
  // its block, never the page. No Suspense and no loading.tsx: this route has
  // to return finished HTML with a real status code (see the SEO rules).
  const scoresPromise = getScores().catch(() => null);
  const trustPromise = getTrust().catch(() => null);
  // Mood, DSEX, breadth and the next record dates. Fetched at the same 3600s
  // as the scores so this page's ISR cadence doesn't tighten to 15 minutes.
  const marketPromise = getMarketState(3600).catch(() => null);
  const moversPromise = getMarketMovers().catch(() => null);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* The signed-in reader's own ৳99 month (client-only; never for guests) */}
      <OfferBanner />

      <HomePersonalizationGate>
        <HeroBlock promise={scoresPromise} marketPromise={marketPromise} />

        <div className="mt-14 sm:mt-20">
          <TrustStripSection promise={scoresPromise} />
        </div>

        <div className="mt-20 flex flex-col gap-20 sm:mt-24 sm:gap-24">
          <WhatWeDoSection promise={scoresPromise} />
          <MarketSection marketPromise={marketPromise} moversPromise={moversPromise} />
        </div>

        <div className="mt-20 sm:mt-24">
          <SignUpSection promise={trustPromise} />
        </div>

        <div className="mt-20 flex flex-col gap-20 sm:mt-24 sm:gap-24">
          <StartFromZero />
          <CloseSection promise={trustPromise} />
        </div>
      </HomePersonalizationGate>

      {/* Signed-in readers only (the component renders nothing for guests) */}
      <FeedbackSection />
    </>
  );
}
