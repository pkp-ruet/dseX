"use client";

import { T } from "@/components/i18n/T";
import PremiumCard from "@/components/premium/PremiumCard";

export const SCREENER_ANCHOR = "sc-premium";

/**
 * The screener's ONE Premium card (`#sc-premium`), where the shares would be
 * for a reader without Premium. Kept to the count and one button (2026-11-14,
 * user: "the premium card looks complex here. make it simple, just say this
 * many shares matches and buy premium to get all"). Never a share's name.
 * On the one Premium card shell since 2026-11-20 (`PremiumCard`).
 */
export default function ScreenerPremium({
  count,
  goal,
}: {
  /** Shares that match the screen now. */
  count: number;
  /** The list picked, for the analytics label. */
  goal?: string | null;
}) {
  return (
    <PremiumCard
      anchor={SCREENER_ANCHOR}
      area="screener"
      lock="screener"
      src="screener"
      track={{ count, goal: goal ?? "", variant: "simple" }}
      tag={{ en: "Screener", bn: "স্ক্রিনার" }}
      title={
        <span className="nums">
          <T en={`${count} ${count === 1 ? "share matches" : "shares match"}`} bn={`${count}টি শেয়ার মিলেছে`} />
        </span>
      }
      lead={
        <T
          en={`Get Premium to see ${count === 1 ? "it" : `all ${count}`}.`}
          bn={`${count === 1 ? "এটি" : `সবগুলো`} দেখতে প্রিমিয়াম নিন।`}
        />
      }
      cta={{
        en: count === 1 ? "See the share" : `See the ${count} shares`,
        bn: count === 1 ? "শেয়ারটি দেখুন" : `${count}টি শেয়ার দেখুন`,
      }}
      context={{
        label: { en: "The stock screener", bn: "স্টক স্ক্রিনার" },
        stakes: [{ en: `${count} shares match`, bn: `${count}টি শেয়ার মিলেছে` }],
      }}
    />
  );
}
