import type { Top20Item } from "@/lib/api";
import Top20Card from "./Top20Card";
import { T } from "@/components/i18n/T";

interface Props {
  items: Top20Item[];
}

/** The trending list as one card of `StockRow`s — the same row the
 *  dashboard rail uses, so the "See all" page reads as more of the same. */
export default function Top20Deck({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-text-muted">
        <T
          en="There is not enough recent market data to build the trending list right now. Please check back after the next trading day."
          bn="ট্রেন্ডিং তালিকা তৈরির মতো যথেষ্ট সাম্প্রতিক তথ্য এখন নেই। পরের লেনদেনের দিনের পর আবার দেখুন।"
        />
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
