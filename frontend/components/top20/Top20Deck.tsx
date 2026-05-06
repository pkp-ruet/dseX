import type { Top20Item } from "@/lib/api";
import Top20Card from "./Top20Card";

interface Props {
  items: Top20Item[];
}

export default function Top20Deck({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--text-muted)]">
        Not enough recent market data to build the Top 20 right now. Check back after the next scrape.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
      {items.map((item) => (
        <Top20Card key={item.trading_code} item={item} />
      ))}
    </div>
  );
}
