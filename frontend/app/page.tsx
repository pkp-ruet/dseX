import type { Metadata } from "next";
import { getScores, getDividendsUpcoming } from "@/lib/api";
import Masthead from "@/components/home/Masthead";
import HeroBand from "@/components/home/HeroBand";
import TierTableSection from "@/components/home/TierTableSection";
import TierDetailsSection from "@/components/home/TierDetailsSection";
import MarketIntelStrip from "@/components/home/MarketIntelStrip";
import HowWeScoreBox from "@/components/home/HowWeScoreBox";

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
  const [scores, dividends] = await Promise.all([
    getScores().catch(() => null),
    getDividendsUpcoming().catch(() => null),
  ]);

  if (!scores) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        Unable to load rankings. Please try again shortly.
      </div>
    );
  }

  const { tiers, counts } = scores;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <div className="max-w-full min-w-0">
        <Masthead />
        <HeroBand counts={counts} />

        <TierTableSection tier="strong_buy" items={tiers.strong_buy} />
        <TierTableSection tier="safe_buy" items={tiers.safe_buy} />

        <TierDetailsSection tier="watch" items={tiers.watch} />
        <TierDetailsSection tier="avoid" items={tiers.avoid} />

        {dividends && <MarketIntelStrip data={dividends} />}
        <HowWeScoreBox />
      </div>
    </>
  );
}
