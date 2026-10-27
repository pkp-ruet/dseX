"use client";
import { T } from "@/components/i18n/T";
import type { Chip, MessageBlock } from "@/lib/assistant/types";

export default function ChipRow({
  block,
  onChip,
}: {
  block: Extract<MessageBlock, { type: "chips" }>;
  onChip: (c: Chip) => void;
}) {
  return (
    <div
      className={`mt-1.5 flex gap-2 ${
        block.layout === "scroll" ? "overflow-x-auto pb-1 -mx-1 px-1" : "flex-wrap"
      }`}
    >
      {block.chips.map((c, i) => (
        <button
          key={`${c.label}-${i}`}
          type="button"
          onClick={() => onChip(c)}
          className="shrink-0 inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-main transition hover:border-primary hover:text-primary active:scale-95"
        >
          <span className="leading-tight text-left">
            <T en={c.label} bn={c.labelBn ?? c.label} />
          </span>
        </button>
      ))}
    </div>
  );
}
