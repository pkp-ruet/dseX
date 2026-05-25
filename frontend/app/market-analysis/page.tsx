import type { Metadata } from "next";
import {
  getMarketIndex,
  getMarketMovers,
  getMarketIntelligence,
  getStockLists,
  getDividendsUpcoming,
  getNearExtremes,
} from "@/lib/api";
import Link from "next/link";
import { formatDate } from "@/lib/formatters";

import MarketPulseStrip from "@/components/market-analysis/MarketPulseStrip";
import SentimentGauge from "@/components/market-analysis/SentimentGauge";
import TrendingStocksGrid from "@/components/market-analysis/TrendingStocksGrid";
import TopPicksTabs from "@/components/market-analysis/TopPicksTabs";
import VolumeSurgeList from "@/components/market-analysis/VolumeSurgeList";
import CatalystStrip from "@/components/market-analysis/CatalystStrip";
import NearExtremesPanel from "@/components/market-analysis/NearExtremesPanel";
import SectorHeatmap, { type SectorHeatmapItem } from "@/components/market/SectorHeatmap";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Market Analysis — DSE Dhaka Stock Exchange",
  description:
    "Comprehensive DSE market analysis: sentiment meter, sector heatmap, volume leaders, top EPS growth picks, 52-week extreme screener, and upcoming dividend catalysts.",
  keywords: [
    "DSE market analysis",
    "Dhaka Stock Exchange",
    "Bangladesh stocks",
    "volume leaders",
    "sector heatmap",
    "52 week high low",
    "market sentiment",
    "stock picks Bangladesh",
  ],
  alternates: { canonical: "/market-analysis" },
  openGraph: {
    title: "Market Analysis — DSE Dhaka Stock Exchange",
    description:
      "DSE market analysis: sentiment meter, sector heatmap, volume leaders, top EPS growth picks, 52-week extreme screener, and upcoming dividend catalysts.",
    url: "/market-analysis",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Market Analysis — DSE Dhaka Stock Exchange",
    description:
      "DSE market analysis: sentiment meter, sector heatmap, volume leaders, top picks, 52-week extremes, and upcoming dividend catalysts.",
  },
};

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function computeSentiment(
  upCount: number | null,
  downCount: number | null,
  neutralCount: number | null,
  volumeChangePct: number | null,
  dsexChangePct: number | null,
): number {
  const total = (upCount ?? 0) + (downCount ?? 0) + (neutralCount ?? 0) || 1;
  const breadthScore = ((upCount ?? 0) / total) * 40;
  const volumeScore = clamp(((volumeChangePct ?? 0) + 20) / 40, 0, 1) * 30;
  const indexScore = clamp(((dsexChangePct ?? 0) + 2) / 4, 0, 1) * 30;
  return Math.round(breadthScore + volumeScore + indexScore);
}

export default async function MarketAnalysisPage() {
  const [indexData, moversData, intelData, stockListsData, dividendsData, nearExtremesData] =
    await Promise.all([
      getMarketIndex().catch(() => null),
      getMarketMovers().catch(() => null),
      getMarketIntelligence().catch(() => null),
      getStockLists().catch(() => null),
      getDividendsUpcoming().catch(() => null),
      getNearExtremes().catch(() => null),
    ]);

  const dateLabel = indexData?.date ? formatDate(indexData.date) : null;

  const sentimentScore = indexData
    ? computeSentiment(
        indexData.up_count,
        indexData.down_count,
        indexData.neutral_count,
        indexData.volume_change_pct,
        indexData.dsex_change_pct,
      )
    : 50;

  const sectorData = (intelData?.signals?.sector_strength ?? []) as SectorHeatmapItem[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/market-analysis`,
        url: `${BASE_URL}/market-analysis`,
        name: "Market Analysis — DSE Dhaka Stock Exchange",
        description:
          "Comprehensive DSE market analysis: sentiment meter, sector heatmap, volume leaders, top EPS growth picks, 52-week extreme screener, and upcoming dividend catalysts.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Market Analysis", item: `${BASE_URL}/market-analysis` },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Page header */}
      <div className="rank-page-header">
        <div className="rank-page-eyebrow">Market Analysis</div>
        <h1 className="rank-page-title">DSE Market Analysis</h1>
        <p className="rank-page-meta">
          Raw data insights{dateLabel ? ` · ${dateLabel}` : ""} · No scoring, just market facts
        </p>
        <p className="rank-page-meta" style={{ marginTop: 4 }}>
          See also:{" "}
          <Link href="/dse-top-20" style={{ textDecoration: "underline" }}>
            DSE Top 20 — 7-day momentum picks
          </Link>
        </p>
      </div>

      {/* 1. Market Pulse */}
      {indexData && <MarketPulseStrip data={indexData} />}

      {/* 2. Sentiment Gauge */}
      <SentimentGauge score={sentimentScore} />

      {/* 3. Trending Stocks — gainers + most_traded, always available */}
      {moversData && (
        <>
          <div className="section-label">Trending Stocks</div>
          <TrendingStocksGrid
            gainers={moversData.gainers ?? []}
            mostTraded={moversData.most_traded ?? []}
          />
        </>
      )}

      {/* 4. Sector Heatmap */}
      {sectorData.length > 0 && (
        <>
          <div className="section-label">Sector Heatmap</div>
          <SectorHeatmap sectors={sectorData} />
        </>
      )}

      {/* 5. Top Picks */}
      {stockListsData && (
        <>
          <div className="section-label">Top Raw Picks</div>
          <TopPicksTabs
            epsGrowth={stockListsData.top_eps_growth ?? []}
            returnW52={stockListsData.top_52w_return ?? []}
            dividend={stockListsData.top_dividend ?? []}
          />
        </>
      )}

      {/* 6. Volume Leaders — top_volume from stock-lists, always populated */}
      {stockListsData && (
        <>
          <div className="section-label">Volume Leaders</div>
          <VolumeSurgeList items={stockListsData.top_volume ?? []} />
        </>
      )}

      {/* 7. Upcoming Catalysts */}
      {dividendsData && (
        <>
          <div className="section-label">Upcoming Catalysts</div>
          <CatalystStrip data={dividendsData} />
        </>
      )}

      {/* 8. Near Extremes */}
      {nearExtremesData && (
        <>
          <div className="section-label">52-Week Extremes</div>
          <NearExtremesPanel data={nearExtremesData} />
        </>
      )}
    </>
  );
}
