import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getScores,
  getDividendsUpcoming,
  getMarketMovers,
  getMarketIndex,
  type ScoresResponse,
  type MarketIndexData,
  type MarketMoversData,
  type DividendsUpcoming,
} from "@/lib/api";
import SearchBar from "@/components/home/SearchBar";
import TickerBand from "@/components/home/TickerBand";
import TopRankings from "@/components/home/TopRankings";
import MarketMovers from "@/components/home/MarketMovers";
import HomeSidebar from "@/components/home/HomeSidebar";
import MarketIndexBanner from "@/components/home/MarketIndexBanner";
import NavHighlights from "@/components/home/NavHighlights";

export const revalidate = 3600;

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
  return <TickerBand items={allItemsFromScores(scores).slice(0, 20)} />;
}

async function MarketIndexSection({ promise }: { promise: Promise<MarketIndexData | null> }) {
  const data = await promise;
  if (!data) return null;
  return <MarketIndexBanner data={data} />;
}

async function MainContentSection({
  scoresPromise,
  moversPromise,
  dividendsPromise,
}: {
  scoresPromise: Promise<ScoresResponse | null>;
  moversPromise: Promise<MarketMoversData | null>;
  dividendsPromise: Promise<DividendsUpcoming | null>;
}) {
  const [scores, movers, dividends] = await Promise.all([
    scoresPromise,
    moversPromise,
    dividendsPromise,
  ]);

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
      <div className="search-mobile-top">
        <SearchBar companies={allCompanies} variant="sidebar" />
      </div>
      <div className="home-layout">
        <div className="home-main min-w-0">
          <Suspense>
            <TopRankings scores={allItems} />
          </Suspense>
          <NavHighlights />
        </div>
        <aside className="home-sidebar">
          <div className="search-desktop-only">
            <SearchBar companies={allCompanies} variant="sidebar" />
          </div>
          {movers && <MarketMovers data={movers} compact />}
          <HomeSidebar scores={scores} dividends={dividends} />
        </aside>
      </div>
    </>
  );
}

export default function HomePage() {
  const scoresPromise = getScores().catch(() => null);
  const dividendsPromise = getDividendsUpcoming().catch(() => null);
  const moversPromise = getMarketMovers().catch(() => null);
  const marketIndexPromise = getMarketIndex().catch(() => null);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Ticker — streams after scores; skeleton reserves exact 36px height */}
      <Suspense fallback={<div className="rounded-[10px] bg-[#0A1628] mb-3 h-9" />}>
        <TickerBandSection promise={scoresPromise} />
      </Suspense>

      {/* LCP candidate — static, in shell HTML immediately, no data dependency */}
      <h1 className="sr-only">DSE Share Price Today — Dhaka Stock Exchange Rankings</h1>
      <p className="text-[11px] text-[var(--text-muted)] text-center px-2 pb-1 leading-relaxed">
        Track <strong>DSE share price</strong> live &middot; <strong>Dhaka Stock Exchange</strong> (DSEX) rankings &middot;{" "}
        <strong>Bangladesh stock market</strong> news &middot; <strong>DSE today</strong> signals
      </p>

      {/* Market index banner — streams independently */}
      <Suspense fallback={null}>
        <MarketIndexSection promise={marketIndexPromise} />
      </Suspense>

      {/* Rankings + sidebar — streams once all data ready */}
      <Suspense fallback={<div className="py-16 text-center text-[var(--text-muted)] text-sm">Loading rankings…</div>}>
        <MainContentSection
          scoresPromise={scoresPromise}
          moversPromise={moversPromise}
          dividendsPromise={dividendsPromise}
        />
      </Suspense>
    </>
  );
}
