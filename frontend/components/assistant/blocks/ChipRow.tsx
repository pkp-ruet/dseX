"use client";
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
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[0.78rem] font-medium text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-95"
        >
          {c.emoji && <span aria-hidden>{c.emoji}</span>}
          <span className="leading-tight text-left">
            {c.label}
            {c.labelBn && (
              <span lang="bn" className="font-bn block text-[0.66rem] text-[var(--text-muted)]">
                {c.labelBn}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
