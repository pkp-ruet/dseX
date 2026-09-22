import type { PopularStockItem } from "@/lib/api";
import StarButton from "@/components/ui/StarButton";
import StockRow, { StockRank } from "@/components/ui/StockRow";

interface Props {
  items: PopularStockItem[];
}

/**
 * The most-viewed stocks as one card of `StockRow`s: rank chip (solid for the
 * top three), company name + code, how many readers looked, price + today's
 * change, a star to follow. Same row as the dashboard's PopularCard.
 */
export default function PopularStocksDeck({ items }: Props) {
  if (items.length === 0) {
    return <div className="py-16 text-center text-text-muted">No visit data yet — check back soon.</div>;
  }

  return (
    <ol className="stock-list mx-auto my-6 max-w-3xl">
      {items.map((item) => (
        <StockRow
          key={item.trading_code}
          code={item.trading_code}
          name={item.company_name}
          leading={<StockRank n={item.rank} solid={item.rank >= 1 && item.rank <= 3} />}
          sub={
            <span className="tabular-nums nums">
              {item.visits_total.toLocaleString("en-US")} views
              {item.sector ? ` · ${item.sector}` : ""}
            </span>
          }
          price={item.ltp}
          change={item.change_pct}
          action={<StarButton code={item.trading_code} size="sm" />}
        />
      ))}
    </ol>
  );
}
