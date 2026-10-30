import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { IconCheck } from "@/components/ui/icons";
import type { Bi, Tone } from "@/lib/stock-report";

/**
 * Server-safe parts shared by the two reports (the stock report and the
 * portfolio report, 2026-10-30): the tone classes, a `{en, bn}` pair as
 * `<T>`, the answer chip and the quiet source line under a row's figures.
 */

export const TONE_CLASS: Record<Tone, string> = {
  good: "rp-tone-good",
  fair: "rp-tone-fair",
  bad: "rp-tone-bad",
  neutral: "rp-tone-neutral",
};

export const tx = (b: Bi | null | undefined) => (b ? <T en={b.en} bn={b.bn || b.en} /> : null);

const CHIP_MARK: Record<Tone, string> = { good: "", fair: "!", bad: "✕", neutral: "–" };

/** The answer to a question as a chip (2026-10-30: filled with its colour and
 *  marked ✓ / ! / ✕, so the answer is the first thing the eye catches). */
export function ToneChip({ word, tone, size = "md" }: { word: Bi; tone: Tone; size?: "md" | "lg" }) {
  return (
    <span className={`rp-chip ${TONE_CLASS[tone]}`} data-size={size}>
      <span className="rp-chip-mark" aria-hidden="true">
        {tone === "good" ? <IconCheck size={12} /> : CHIP_MARK[tone]}
      </span>
      <span className="rp-chip-text">{tx(word)}</span>
    </span>
  );
}

/** The quiet last line of a question's fold: where the figures come from,
 *  and an optional control (the share button). */
export function SectionFoot({ source, action }: { source?: ReactNode; action?: ReactNode }) {
  if (!source && !action) return null;
  return (
    <div className="rp-foot">
      <p className="min-w-0 text-xs leading-snug text-text-muted">{source}</p>
      {action}
    </div>
  );
}
