import Link from "next/link";
import type { ScoreItem } from "@/lib/api";

interface Props {
  items: ScoreItem[];
}

export default function TopEPS({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="sidebar-widget">
      <div className="sidebar-widget-title">EPS Growth Leaders</div>
      {items.map((item) => {
        const eps = item.eps_yoy_pct ?? 0;
        const capped = Math.min(eps, 9999);
        return (
          <Link
            key={item.trading_code}
            href={`/stock/${item.trading_code}`}
            className="sidebar-row"
          >
            <span className="sidebar-row-key">{item.trading_code}</span>
            <span className="sidebar-row-val sidebar-row-val-pos">
              +{capped.toFixed(0)}%
            </span>
          </Link>
        );
      })}
    </div>
  );
}
