import type { Metadata } from "next";
import { Suspense } from "react";
import { getScores, getDividendsUpcoming, getMarketMovers } from "@/lib/api";
import type { FrontendTiers } from "@/lib/api";
import { getTier } from "@/lib/constants";
import Masthead from "@/components/home/Masthead";
import SearchBar from "@/components/home/SearchBar";
import TickerBand from "@/components/home/TickerBand";
import FilterableRankings from "@/components/home/FilterableRankings";
import HowWeScoreBox from "@/components/home/HowWeScoreBox";
import MarketMovers from "@/components/home/MarketMovers";
import HomeSidebar from "@/components/home/HomeSidebar";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "dseX — DSE Stock Rankings & DSEF Scores | Dhaka Stock Exchange",
  description:
    "Free fundamental analysis and DSEF scores for all Dhaka Stock Exchange (DSE) listed companies. Find Strong Buy, Safe Buy, Watch, and Avoid tier rankings driven by fundamentals.",
  openGraph: {
    title: "dseX — DSE Stock Rankings & DSEF Scores",
    description: "Fundamental analysis rankings for all DSE listed companies.",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "dseX",
  description: "DSEF-powered fundamental rankings for Dhaka Stock Exchange listed companies",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || "https://dsex.app"}/stock/{search_term}`,
    },
    "query-input": "required name=search_term",
  },
};

export default async function HomePage() {
  const [scores, dividends, movers] = await Promise.all([
    getScores().catch(() => null),
    getDividendsUpcoming().catch(() => null),
    getMarketMovers().catch(() => null),
  ]);

  if (!scores) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        Unable to load rankings. Please try again shortly.
      </div>
    );
  }

  const { tiers, counts } = scores;

  const allItems = [
    ...tiers.strong_buy,
    ...tiers.safe_buy,
    ...tiers.watch,
    ...tiers.avoid,
  ];

  // Re-classify from 4 API tiers into 6 frontend tiers
  const frontendTiers: FrontendTiers = {
    strong_buy: [], good_buy: [], safe_buy: [],
    cautious_buy: [], keep_watching: [], avoid: [],
  };
  for (const item of allItems) {
    frontendTiers[getTier(item.score)].push(item);
  }

  const top20 = allItems.slice(0, 20);

  const allCompanies = allItems.map((c) => ({
    trading_code: c.trading_code,
    company_name: c.company_name,
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Full-width masthead + ticker */}
      <Masthead />
      <TickerBand items={top20} />

      {/* Two-column layout: main rankings (left) + sidebar (right) */}
      <div className="home-layout">
        {/* Left: rankings */}
        <div className="home-main min-w-0">
          <Suspense>
            <FilterableRankings tiers={frontendTiers} />
          </Suspense>
          <HowWeScoreBox />
        </div>

        {/* Right: search, market movers, then rest of sidebar */}
        <aside className="home-sidebar">
          <SearchBar companies={allCompanies} variant="sidebar" />
          {movers && <MarketMovers data={movers} compact />}
          <HomeSidebar scores={scores} dividends={dividends} />
        </aside>
      </div>
    </>
  );
}
