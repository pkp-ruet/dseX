import RecommendedStockCard from "@/components/stock-recommendation/RecommendedStockCard";
import { T } from "@/components/i18n/T";
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
        <p className="text-xs text-text-muted">
          {/* The engine names the widened answers in English only, so Bengali mode gives the general line. */}
          <T
            en={`${COPY.suggest.relaxedPrefix} ${block.relaxations.join("; ")}.`}
            bn={COPY.suggest.relaxedBn}
          />
        </p>
      )}
      {block.picks.map((p, i) => (
        <RecommendedStockCard key={p.trading_code} stock={p} rank={i} compact />
      ))}
    </div>
  );
}
