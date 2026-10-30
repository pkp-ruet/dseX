import { T } from "@/components/i18n/T";
import { IconCheck } from "@/components/ui/icons";
import { bnDate } from "@/lib/bn";
import { formatDate, money, taka } from "@/lib/formatters";
import type { Bi, Tone } from "@/lib/stock-report";

/** Server-safe helpers shared by the report's server and client parts. */

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

/** A date in the page language ("16 Nov 2026" / "16 নভেম্বর 2026"). */
export function DateT({ iso }: { iso: string | null | undefined }) {
  if (!iso) return null;
  return <T en={formatDate(iso)} bn={bnDate(iso) || formatDate(iso)} />;
}

/** Per-share money keeps two decimals (৳0.25 must not print as ৳0.3). */
export const perShare = (v: number | null | undefined) => (v == null ? "--" : taka(v, 2));

export { money };

/** % with a sign, one decimal. */
export const signedPct = (v: number | null | undefined) =>
  v == null ? "--" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

/** A small label above a figure. */
export function Label({ en, bn }: Bi) {
  return (
    <span className="block text-xs font-semibold text-text-muted">
      <T en={en} bn={bn} />
    </span>
  );
}
