"use client";

import { T } from "@/components/i18n/T";
import PremiumCard from "@/components/premium/PremiumCard";
import type { Bi } from "@/lib/screener";

export const SCREENER_ANCHOR = "sc-premium";

/**
 * The screener's ONE Premium card (`#sc-premium`), on the one Premium card
 * shell (`PremiumCard`). Never a share's name.
 *
 * - `list` (default): under a list's masked rows — "22 shares match", "Get
 *   Premium to see all 22", then what is behind the grey bars in counts and
 *   figures (`facts`: how many joined this week, the sector most of them are
 *   in, the first one's key figure, how many are the reader's own shares).
 * - `mine`: in "Check my shares" — how many of the reader's shares are on our
 *   lists, which is Premium (2026-11-24).
 */
export default function ScreenerPremium({
  count,
  goal,
  joined = 0,
  facts = [],
  variant = "list",
}: {
  /** Shares that match the list now (`mine`: the reader's shares checked). */
  count: number;
  /** The list picked, for the analytics label. */
  goal?: string | null;
  /** How many of them joined the list this week: a count, never a name. */
  joined?: number;
  /** Counts and figures about what is hidden, one line each. */
  facts?: Bi[];
  variant?: "list" | "mine";
}) {
  const mine = variant === "mine";
  const fresh = !mine && joined > 0 && joined <= count;
  const lines: Bi[] = [
    ...(fresh ? [{ en: `${joined === count ? "All" : joined} joined this week`, bn: `${joined === count ? "সবগুলো" : `${joined}টি`} এ সপ্তাহে যোগ হয়েছে` }] : []),
    ...facts,
  ];
  return (
    <PremiumCard
      anchor={SCREENER_ANCHOR}
      area="screener"
      lock={mine ? "screener-mine" : "screener"}
      src="screener"
      track={{ count, goal: goal ?? "", variant: mine ? "mine" : "masked", joined }}
      tag={{ en: "Screener", bn: "স্ক্রিনার" }}
      title={
        <span className="nums">
          {mine ? (
            <T en="See which lists your shares are on" bn="আপনার শেয়ার কোন তালিকায় আছে দেখুন" />
          ) : (
            <T en={`${count} ${count === 1 ? "share matches" : "shares match"}`} bn={`${count}টি শেয়ার মিলেছে`} />
          )}
        </span>
      }
      lead={
        mine ? (
          <T
            en="For each share you own or follow: the lists it is on, and the one thing it misses on the others."
            bn="আপনার নিজের বা নজরে রাখা প্রতিটি শেয়ার: কোন কোন তালিকায় আছে, আর বাকিগুলোতে কোন একটি জিনিসে মেলেনি।"
          />
        ) : (
          <T
            en={`Get Premium to see ${count === 1 ? "which share it is" : `which ${count} shares they are`}.`}
            bn={`${count === 1 ? "শেয়ারটি কোনটি" : `${count}টি শেয়ার কোনগুলো`} দেখতে প্রিমিয়াম নিন।`}
          />
        )
      }
      cta={
        mine
          ? { en: "Check my shares", bn: "আমার শেয়ার যাচাই করুন" }
          : { en: count === 1 ? "See the share" : `See the ${count} shares`, bn: count === 1 ? "শেয়ারটি দেখুন" : `${count}টি শেয়ার দেখুন` }
      }
      context={{
        label: { en: "The stock screener", bn: "স্টক স্ক্রিনার" },
        stakes: [mine ? { en: `${count} of your shares checked`, bn: `আপনার ${count}টি শেয়ার যাচাই` } : { en: `${count} shares match`, bn: `${count}টি শেয়ার মিলেছে` }],
      }}
    >
      {lines.length > 0 && (
        <ul className="scr-promo-facts">
          {lines.map((l) => (
            <li key={l.en}><T en={l.en} bn={l.bn} /></li>
          ))}
        </ul>
      )}
    </PremiumCard>
  );
}
