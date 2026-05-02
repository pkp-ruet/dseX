import type { MarketMoverItem, MarketSignalItem } from "@/lib/api";
import SignalTable from "@/components/market-intelligence/SignalTable";

interface Props {
  gainers: MarketMoverItem[];
  mostTraded: MarketMoverItem[];
}

function moverToSignal(item: MarketMoverItem): MarketSignalItem {
  return {
    trading_code: item.trading_code,
    company_name: item.company_name,
    sector: null,
    ltp: item.ltp,
    change_pct: item.change_pct,
    volume: item.volume,
    value_mn: item.value_mn,
    avg_volume_7d: null,
    volume_ratio: null,
    score: null,
  };
}

export default function TrendingStocksGrid({ gainers, mostTraded }: Props) {
  return (
    <div className="intel-grid">
      <SignalTable
        title="Top Gainers"
        description="Top price gainers today by percentage change."
        items={gainers.map(moverToSignal)}
        metricCol="change_pct"
        metricLabel="Chg%"
        titleColor="#059669"
      />
      <SignalTable
        title="Most Traded"
        description="Highest value traded today — where market attention is focused."
        items={mostTraded.map(moverToSignal)}
        metricCol="change_pct"
        metricLabel="Chg%"
        titleColor="#2563EB"
      />
    </div>
  );
}
