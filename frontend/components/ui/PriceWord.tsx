import { PRICE_WORDS, type PriceWordKey } from "@/lib/constants";
import { T } from "@/components/i18n/T";

interface Props {
  /** very_low | low | fair — from `priceWordKey(signal)`. null renders nothing. */
  word: PriceWordKey | null | undefined;
  /** "Very low price" (default) or the short "Very low" for tight rows. */
  short?: boolean;
  className?: string;
}

/**
 * The price word on a Buy (2026-10-31): replaced the "Strong buy" chip. What
 * made a Buy "strong" was only the price, so the row says the price in plain
 * words. Very low = filled positive (the old Strong-buy look), Low = tinted
 * positive, Fair = neutral. Shape matches `TierPill`, so the two sit side by side.
 */
export default function PriceWord({ word, short = false, className = "" }: Props) {
  if (!word) return null;
  const w = PRICE_WORDS[word];
  const tone =
    word === "very_low"
      ? "bg-positive text-surface border-positive"
      : word === "low"
        ? "bg-positive/10 text-positive border-positive/25"
        : "bg-surface-2 text-text-main border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold leading-tight whitespace-nowrap ${tone} ${className}`}
    >
      <T en={short ? w.short.en : w.en} bn={short ? w.short.bn : w.bn} />
    </span>
  );
}
