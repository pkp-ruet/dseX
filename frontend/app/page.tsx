import type { Metadata } from "next";
import { Suspense } from "react";
import { getScores, getDividendsUpcoming, getMarketMovers } from "@/lib/api";
import Masthead from "@/components/home/Masthead";
import SearchBar from "@/components/home/SearchBar";
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

  const allCompanies = [
    ...tiers.strong_buy,
    ...tiers.safe_buy,
    ...tiers.watch,
    ...tiers.avoid,
  ].map((c) => ({ trading_code: c.trading_code, company_name: c.company_name }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Full-width masthead */}
      <Masthead />

      {/* Two-column layout: main rankings (left) + sidebar (right) */}
      <div className="home-layout">
        {/* Left: market movers now leads, then rankings */}
        <div className="home-main min-w-0">
          {movers && <MarketMovers data={movers} />}
          <Suspense>
            <FilterableRankings tiers={tiers} counts={counts} />
          </Suspense>
          <HowWeScoreBox />
        </div>

        {/* Right: search sits above score overview, then rest of sidebar */}
        <aside className="home-sidebar">
          <SearchBar companies={allCompanies} variant="sidebar" />
          <HomeSidebar scores={scores} dividends={dividends} />
        </aside>
      </div>
    </>
  );
}
