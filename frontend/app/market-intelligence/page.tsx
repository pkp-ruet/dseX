import type { Metadata } from "next";
import { getMarketIntelligence } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import ConditionBanner from "@/components/market-intelligence/ConditionBanner";
import SignalTable from "@/components/market-intelligence/SignalTable";
import SectorMap from "@/components/market-intelligence/SectorMap";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Market Intelligence — DSE Stock Analysis",
  description:
    "Real-time market condition detection for the Dhaka Stock Exchange. Find accumulation signals, momentum breakouts, and hidden setups based on price and volume analysis.",
  alternates: { canonical: "/market-intelligence" },
  openGraph: {
    title: "Market Intelligence — DSE Stock Analysis",
    description: "Real-time market condition detection for the Dhaka Stock Exchange. Find accumulation signals, momentum breakouts, and hidden setups.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Market Intelligence — DSE Stock Analysis",
    description: "Real-time market condition detection for the Dhaka Stock Exchange. Accumulation signals, momentum breakouts, and hidden setups.",
  },
};

export default async function MarketIntelligencePage() {
  const data = await getMarketIntelligence().catch(() => null);

  if (!data) {
    return (
      <div className="rank-page-header">
        <div className="rank-page-eyebrow">Market Intelligence</div>
        <h1 className="rank-page-title">No Data Available</h1>
        <p className="rank-page-meta">
          Could not reach the API. Please try again shortly.
        </p>
      </div>
    );
  }

  const { market_condition, market_summary, signals } = data;
  const dateLabel = market_summary.date ? formatDate(market_summary.date) : null;

  return (
    <>
      {/* Page header */}
      <div className="rank-page-header">
        <div className="rank-page-eyebrow">Market Intelligence</div>
        <h1 className="rank-page-title">DSE Market Signals</h1>
        <p className="rank-page-meta">
          Auto-detected market state{dateLabel ? ` · ${dateLabel}` : ""}
        </p>
      </div>

      {/* Condition banner */}
      <ConditionBanner condition={market_condition} summary={market_summary} />

      {/* === UNKNOWN — no signal data for this date === */}
      {market_condition === "unknown" && (
        <div className="intel-signal-card intel-signal-card--full">
          <div className="intel-empty">
            No trading signals available for the latest date. Run{" "}
            <code>python main.py scrape-prices</code> to update with fresh data.
          </div>
        </div>
      )}

      {/* === FALLING signals === */}
      {market_condition === "falling" && (
        <>
          <div className="intel-grid">
            {signals.accumulation_radar && (
              <SignalTable
                title="Accumulation Radar"
                description="Losing less than the market average while trading above normal volume — smart money absorbing the sell-off."
                items={signals.accumulation_radar}
                metricCol="volume_ratio"
                metricLabel="Vol ×"
                titleColor="#0D9488"
              />
            )}
            {signals.sector_strength && (
              <SectorMap
                sectors={signals.sector_strength}
                condition={market_condition}
                fullWidth={false}
                titleColor="#7C3AED"
              />
            )}
          </div>
          <div className="intel-grid">
            {signals.resilience_leaders && (
              <SignalTable
                title="Resilience Leaders"
                description="Stocks holding up best relative to today's market. Safe harbors in a down session."
                items={signals.resilience_leaders}
                metricCol="change_pct"
                metricLabel="Change"
                titleColor="#2563EB"
              />
            )}
            {signals.floor_watch && (
              <SignalTable
                title="Floor Watch"
                description="Dropping but seeing heavy volume — selling pressure being absorbed. Potential base formation."
                items={signals.floor_watch}
                metricCol="volume_ratio"
                metricLabel="Vol ×"
                titleColor="#D97706"
              />
            )}
          </div>
        </>
      )}

      {/* === RISING signals === */}
      {market_condition === "rising" && (
        <>
          {signals.volume_breakouts && (
            <div className="intel-grid intel-grid--full">
              <SignalTable
                title="Volume-Confirmed Breakouts"
                description="Rising more than the market with 2× or higher volume — conviction buying, not just index drift."
                items={signals.volume_breakouts}
                metricCol="volume_ratio"
                metricLabel="Vol ×"
                fullWidth
                titleColor="#059669"
              />
            </div>
          )}
          <div className="intel-grid">
            {signals.momentum_leaders && (
              <SignalTable
                title="Momentum Leaders"
                description="Top gainers today. Watch for continuation if volume stays elevated."
                items={signals.momentum_leaders}
                metricCol="change_pct"
                metricLabel="Change"
                titleColor="#0D9488"
              />
            )}
            {signals.quality_laggards && (
              <SignalTable
                title="Quality Laggards"
                description="High DSEF score stocks not participating in the rally — discounted entry while the market is in good mood."
                items={signals.quality_laggards}
                metricCol="score"
                metricLabel="Score"
                titleColor="#D97706"
              />
            )}
          </div>
        </>
      )}

      {/* === SIDEWAYS signals === */}
      {market_condition === "sideways" && (
        <>
          {signals.volume_divergence && (
            <div className="intel-grid intel-grid--full">
              <SignalTable
                title="Volume Divergence"
                description="Price is flat but volume is spiking — smart money positioning quietly before a move."
                items={signals.volume_divergence}
                metricCol="volume_ratio"
                metricLabel="Vol ×"
                fullWidth
                titleColor="#7C3AED"
              />
            </div>
          )}
          <div className="intel-grid">
            {signals.hidden_gems && (
              <SignalTable
                title="Hidden Gems"
                description="High DSEF score stocks trading sideways — strong fundamentals waiting for a catalyst."
                items={signals.hidden_gems}
                metricCol="score"
                metricLabel="Score"
                titleColor="#059669"
              />
            )}
            {signals.dividend_capture && signals.dividend_capture.length > 0 && (
              <SignalTable
                title="Dividend Capture"
                description="Record dates within 14 days. Flat price + upcoming dividend = potential re-rating."
                items={signals.dividend_capture}
                metricCol="score"
                metricLabel="Score"
                titleColor="#D97706"
              />
            )}
          </div>
        </>
      )}

      {/* Sector map — rising and sideways (falling already shows it inline) */}
      {market_condition !== "falling" && signals.sector_strength && (
        <SectorMap
          sectors={signals.sector_strength}
          condition={market_condition}
          titleColor="#7C3AED"
        />
      )}
    </>
  );
}
