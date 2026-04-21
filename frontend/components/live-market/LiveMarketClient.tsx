"use client";
import { useState } from "react";
import { useLiveMarket } from "@/hooks/useLiveMarket";
import MarketStatusBanner from "./MarketStatusBanner";
import IndexStrip from "./IndexStrip";
import BreadthBar from "./BreadthBar";
import GainersLosers from "./GainersLosers";
import SectorHeatmap from "./SectorHeatmap";
import WhatsHot from "./WhatsHot";
import LivePricesTable from "./LivePricesTable";
import PSNTicker from "./PSNTicker";
import LiveRefreshBadge from "./LiveRefreshBadge";

export default function LiveMarketClient() {
  const { data, loading, secondsSinceUpdate, refresh } = useLiveMarket();
  const [sectorFilter, setSectorFilter] = useState("");

  const isOpen = data?.is_open ?? false;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Live Market</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Dhaka Stock Exchange — real-time data
          </p>
        </div>
        <LiveRefreshBadge
          secondsSinceUpdate={secondsSinceUpdate}
          loading={loading}
          onRefresh={refresh}
          isOpen={isOpen}
        />
      </div>

      {/* Market status */}
      <MarketStatusBanner />

      {/* PSN news ticker — top placement for urgency */}
      {data?.psn_news && data.psn_news.length > 0 && (
        <PSNTicker news={data.psn_news} />
      )}

      {/* Index strip */}
      <IndexStrip index={data?.index} />

      {/* Breadth bar */}
      {data?.breadth && <BreadthBar breadth={data.breadth} />}

      {/* Gainers / Losers */}
      {data && (
        <GainersLosers
          gainers={data.top_gainers ?? []}
          losers={data.top_losers ?? []}
        />
      )}

      {/* What's hot */}
      {data?.whats_hot && data.whats_hot.length > 0 && (
        <WhatsHot items={data.whats_hot} />
      )}

      {/* Sector heatmap */}
      {data?.sector_performance && data.sector_performance.length > 0 && (
        <SectorHeatmap
          sectors={data.sector_performance}
          onSectorClick={(s) => setSectorFilter(sectorFilter === s ? "" : s)}
        />
      )}

      {/* All prices table */}
      {data?.prices && data.prices.length > 0 ? (
        <LivePricesTable
          prices={data.prices}
          sectors={data.sector_performance}
        />
      ) : !loading && isOpen ? (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--text-muted)] mb-6">
          Loading live prices…
        </div>
      ) : null}

      {/* Closed state — show placeholder content */}
      {!isOpen && !loading && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8 text-center mb-6">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-base font-semibold text-[var(--text)] mb-1">Market is closed</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Live prices will appear here during trading hours (Sun–Thu, 10:00–14:30 BST).
          </p>
        </div>
      )}

      {/* Loading skeleton on first load */}
      {loading && !data && (
        <div className="space-y-3 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
