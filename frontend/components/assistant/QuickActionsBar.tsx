"use client";
import type { Chip } from "@/lib/assistant/types";
import { STARTER_CHIPS } from "@/lib/assistant/chips";

/**
 * Always-visible quick-action strip pinned above the composer, so a new query
 * is one tap away from anywhere in the conversation. During the guided suggest
 * flow it collapses to a single "Start over" chip so a stray tap can't derail
 * the questions.
 */
export default function QuickActionsBar({
  flowActive,
  onChip,
  onCancel,
}: {
  flowActive: boolean;
  onChip: (c: Chip) => void;
  onCancel: () => void;
}) {
  return (
    <div className="disha-qbar flex flex-nowrap items-center gap-2 overflow-x-auto border-t border-border bg-surface-2 px-2.5 py-2 sm:flex-wrap sm:overflow-x-visible">
      {flowActive ? (
        <button
          type="button"
          onClick={onCancel}
          className="btn-quiet btn-sm shrink-0 hover:border-negative hover:text-negative"
        >
          Start over
        </button>
      ) : (
        STARTER_CHIPS.map((c, i) => (
          <button
            key={`${c.label}-${i}`}
            type="button"
            onClick={() => onChip(c)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-main transition hover:border-primary hover:text-primary active:scale-95"
          >
            {c.emoji && <span aria-hidden>{c.emoji}</span>}
            <span className="leading-tight text-left">
              {c.label}
              {c.labelBn && (
                <span lang="bn" className="font-bn block text-xs text-text-muted">
                  {c.labelBn}
                </span>
              )}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
