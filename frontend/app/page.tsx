import type { Metadata } from "next";
import { Suspense } from "react";
import { getScores, getDividendsUpcoming, getMarketMovers, getMarketIndex } from "@/lib/api";
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

export default async function HomePage() {
  const [scores, dividends, movers, marketIndex] = await Promise.all([
    getScores().catch(() => null),
    getDividendsUpcoming().catch(() => null),
    getMarketMovers().catch(() => null),
    getMarketIndex().catch(() => null),
  ]);

  if (!scores) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        Unable to load rankings. Please try again shortly.
      </div>
    );
  }

  const { tiers } = scores;

  const allItems = [
    ...tiers.strong_buy,
    ...tiers.safe_buy,
    ...tiers.watch,
    ...tiers.avoid,
  ];

  const top20 = allItems.slice(0, 20);

  const allCompanies = allItems.map((c) => ({
    trading_code: c.trading_code,
    company_name: c.company_name,
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Full-width masthead + ticker */}
      <TickerBand items={top20} />
      <p className="text-[11px] text-[var(--text-muted)] text-center px-2 pb-1 leading-relaxed">
        Track <strong>DSE share price</strong> live &middot; <strong>Dhaka Stock Exchange</strong> (DSEX) rankings &middot;{" "}
        <strong>Bangladesh stock market</strong> news &middot; <strong>DSE today</strong> signals
      </p>
      {marketIndex && <MarketIndexBanner data={marketIndex} />}

      {/* Mobile-only search bar — above rankings on narrow screens */}
      <div className="search-mobile-top">
        <SearchBar companies={allCompanies} variant="sidebar" />
      </div>

      {/* Two-column layout: main rankings (left) + sidebar (right) */}
      <div className="home-layout">
        {/* Left: rankings */}
        <div className="home-main min-w-0">
          <Suspense>
            <TopRankings scores={allItems} />
          </Suspense>
          <NavHighlights />
        </div>

        {/* Right: search, market movers, then rest of sidebar */}
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
