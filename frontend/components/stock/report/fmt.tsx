import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";
import { formatDate, money, taka } from "@/lib/formatters";
import type { Bi } from "@/lib/stock-report";

/** Server-safe helpers shared by the report's server and client parts. */

export { TONE_CLASS, ToneChip, tx } from "@/components/report/chip";

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
