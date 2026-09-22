import type { Top20Item } from "@/lib/api";
import Top20Card from "./Top20Card";

interface Props {
  items: Top20Item[];
}

/** The trending list as one card of `StockRow`s — the same row the dashboard's
 *  TrendingCard uses, so the "See all" page reads as more of the same. */
export default function Top20Deck({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-text-muted">
        Not enough recent market data to build the Trending Stocks list right now. Check back after the next scrape.
      </div>
    );
  }

  return (
    <ol className="stock-list">
      {items.map((item) => (
        <Top20Card key={item.trading_code} item={item} />
      ))}
    </ol>
  );
}
