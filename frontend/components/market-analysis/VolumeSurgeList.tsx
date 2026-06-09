import Link from "next/link";
import type { StockListItem } from "@/lib/stock-lists";
import { taka, croreShares } from "@/lib/formatters";

interface Props {
  items: StockListItem[];
}

export default function VolumeSurgeList({ items }: Props) {
  return (
    <div className="intel-signal-card intel-signal-card--full mb-4">
      <div className="intel-signal-title" style={{ color: "#7C3AED" }}>Volume Leaders</div>
      <div className="intel-signal-desc">
        Stocks with highest raw trading volume today — where the market is most active.
      </div>

      {items.length === 0 ? (
        <div className="intel-empty">No volume data available</div>
      ) : (
        <>
          <div className="intel-row intel-row-header">
            <span>Code</span>
            <span>Company</span>
            <span>LTP</span>
            <span style={{ textAlign: "right" }}>Volume</span>
          </div>
          {items.slice(0, 15).map((item) => (
            <Link
              key={item.trading_code}
              href={`/stock/${item.trading_code}`}
              className="intel-row"
            >
              <span className="intel-code">{item.trading_code}</span>
              <span className="intel-ltp text-[var(--text-muted)] text-xs truncate">
                {item.company_name ?? "—"}
              </span>
              <span className="intel-ltp">{taka(item.ltp)}</span>
              <span className="intel-metric" style={{ color: "#7C3AED", textAlign: "right" }}>
                {item.metric_value != null ? croreShares(item.metric_value) : "—"}
              </span>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}
