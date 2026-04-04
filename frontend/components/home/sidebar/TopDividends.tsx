import Link from "next/link";
import { pct } from "@/lib/formatters";
import type { ScoreItem } from "@/lib/api";

interface Props {
  items: ScoreItem[];
}

export default function TopDividends({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="sidebar-widget">
      <div className="sidebar-widget-title">Top Dividend Yield</div>
      {items.map((item) => (
        <Link
          key={item.trading_code}
          href={`/stock/${item.trading_code}`}
          className="sidebar-row"
        >
          <span className="sidebar-row-key">{item.trading_code}</span>
          <span className="sidebar-row-val">{pct(item.div_yield_pct, 1)}</span>
        </Link>
      ))}
    </div>
  );
}
