"use client";
import type { Chip, MessageBlock } from "@/lib/assistant/types";
import TextBlock from "./blocks/TextBlock";
import ChipRow from "./blocks/ChipRow";
import StockListBlock from "./blocks/StockListBlock";
import RecommendedListBlock from "./blocks/RecommendedListBlock";
import MarketSummaryBlock from "./blocks/MarketSummaryBlock";
import StockDetailBlock from "./blocks/StockDetailBlock";
import LoadingBlock from "./blocks/LoadingBlock";
import DisclaimerNote from "./blocks/DisclaimerNote";

export default function MessageBlockRenderer({
  block,
  onChip,
}: {
  block: MessageBlock;
  onChip: (c: Chip) => void;
}) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "chips":
      return <ChipRow block={block} onChip={onChip} />;
    case "stock-list":
      return <StockListBlock block={block} />;
    case "recommended-list":
      return <RecommendedListBlock block={block} />;
    case "market-summary":
      return <MarketSummaryBlock block={block} />;
    case "stock-detail":
      return <StockDetailBlock block={block} />;
    case "loading":
      return <LoadingBlock />;
    case "disclaimer":
      return <DisclaimerNote />;
    default:
      return null;
  }
}
