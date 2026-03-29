import type { Metadata } from "next";
import { getScores, getDividendsUpcoming } from "@/lib/api";
import HeroBand from "@/components/home/HeroBand";
import TierSection from "@/components/home/TierSection";
import MarketIntelStrip from "@/components/home/MarketIntelStrip";
import HowWeScoreBox from "@/components/home/HowWeScoreBox";
import SectionLabel from "@/components/ui/SectionLabel";

export const revalidate = 3600; // ISR: rebuild at most once per hour

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* Masthead */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight">dseX</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Driven by fundamentals · Designed for long-term winners
        </p>
      </div>

      <HeroBand counts={counts} />

      <SectionLabel>Strong Buy</SectionLabel>
      <TierSection tier="strong_buy" items={tiers.strong_buy} initialVisible={10} defaultOpen={true} />

      <SectionLabel>Safe Buy</SectionLabel>
      <TierSection tier="safe_buy" items={tiers.safe_buy} initialVisible={10} defaultOpen={true} />

      <SectionLabel>Watch</SectionLabel>
      <TierSection tier="watch" items={tiers.watch} initialVisible={5} />

      <SectionLabel>Avoid</SectionLabel>
      <TierSection tier="avoid" items={tiers.avoid} initialVisible={5} />

      {dividends && <MarketIntelStrip data={dividends} />}
      <HowWeScoreBox />
    </>
  );
}
