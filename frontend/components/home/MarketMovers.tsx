import Link from "next/link";
import { taka, pct, formatDate, abbrev } from "@/lib/formatters";

export interface MarketMoverItem {
  trading_code: string;
  company_name: string | null;
  ltp: number | null;
  change: number | null;
  change_pct: number | null;
  volume: number | null;
  value_mn: number | null;
}

export interface MarketMoversData {
  date: string | null;
  gainers: MarketMoverItem[];
  losers: MarketMoverItem[];
  most_traded: MarketMoverItem[];
}

function MoverRow({
  item,
  metric,
}: {
  item: MarketMoverItem;
  metric: "change" | "value";
}) {
  const changePct = item.change_pct;
  const isPositive = (changePct ?? 0) >= 0;
  const changeColor = isPositive ? "var(--positive)" : "var(--negative)";

  return (
    <Link href={`/stock/${item.trading_code}`} className="info-col-row--intel">
      <span className="icr-key">{item.trading_code}</span>
      <span className="icr-sub min-w-0 truncate">
        {item.ltp != null ? taka(item.ltp) : "—"}
      </span>
      <span className="icr-val" style={{ color: metric === "change" ? changeColor : undefined }}>
        {metric === "change"
          ? changePct != null
            ? `${changePct >= 0 ? "+" : ""}${pct(changePct)}`
            : "—"
          : item.value_mn != null
            ? `৳${abbrev(item.value_mn)}M`
            : "—"}
      </span>
    </Link>
  );
}

export default function MarketMovers({ data }: { data: MarketMoversData }) {
  const hasData =
    data.gainers.length > 0 ||
    data.losers.length > 0 ||
    data.most_traded.length > 0;

  if (!hasData) return null;

  const dateLabel = data.date ? formatDate(data.date) : "Latest";

  return (
    <>
      <div className="section-rule-modern">
        <span className="section-rule-text">Market Movers — {dateLabel}</span>
      </div>

      <div className="movers-strip">
        <div className="info-col">
          <div className="info-col-header">Top Gainers</div>
          {data.gainers.map((item) => (
            <MoverRow key={item.trading_code} item={item} metric="change" />
          ))}
        </div>
        <div className="info-col">
          <div className="info-col-header">Top Losers</div>
          {data.losers.map((item) => (
            <MoverRow key={item.trading_code} item={item} metric="change" />
          ))}
        </div>
        <div className="info-col">
          <div className="info-col-header">Most Traded</div>
          {data.most_traded.map((item) => (
            <MoverRow key={item.trading_code} item={item} metric="value" />
          ))}
        </div>
      </div>
    </>
  );
}
