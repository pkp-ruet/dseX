import RecommendedStockCard from "@/components/stock-recommendation/RecommendedStockCard";
import { COPY } from "@/lib/assistant/copy";
import type { MessageBlock } from "@/lib/assistant/types";

export default function RecommendedListBlock({
  block,
}: {
  block: Extract<MessageBlock, { type: "recommended-list" }>;
}) {
  return (
    <div className="mt-1 space-y-2">
      {block.relaxations.length > 0 && (
        <p className="text-[0.72rem] text-[var(--text-muted)]">
          {COPY.suggest.relaxedPrefix} {block.relaxations.join("; ")}.
        </p>
      )}
      {block.picks.map((p, i) => (
        <RecommendedStockCard key={p.trading_code} stock={p} rank={i} compact />
      ))}
    </div>
  );
}
