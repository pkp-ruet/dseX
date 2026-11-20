"use client";

import type { ForYou } from "@/lib/api";
import { T } from "@/components/i18n/T";
import PremiumCard, { PremiumTicks } from "@/components/premium/PremiumCard";

/** Anchor of the card: a free reader's locked rows point here. */
export const FOR_YOU_PREMIUM_ANCHOR = "fu-premium";

/**
 * The one Premium card on "Based on your shares", for a free reader (2026-11-18,
 * user: "we will tell users we picked this number of stocks for him and the
 * reason. the premium will tell the full list and reason"). The count and
 * the shares they came from are free above it; this card says what Premium
 * names. Never a company name.
 */
export default function ForYouPremium({ data }: { data: ForYou }) {
  const n = data.counts?.total ?? data.items.length;
  const shares = (data.groups ?? []).filter((g) => g.anchor).length;
  const ticks = [
    { en: "Every company's name, under the share it came from", bn: "প্রতিটি কোম্পানির নাম, যে শেয়ার থেকে এসেছে তার নিচে" },
    { en: "Why each one fits you, and what it has in common with your share", bn: "কেন প্রতিটি আপনার সাথে মেলে, আর আপনার শেয়ারের সাথে কী মিল" },
    { en: "New companies after every close", bn: "প্রতিদিন বাজার বন্ধের পর নতুন কোম্পানি" },
  ];

  return (
    <PremiumCard
      anchor={FOR_YOU_PREMIUM_ANCHOR}
      area="for-you"
      lock="for-you"
      src="for-you"
      track={{ stakes: n }}
      tag={{ en: "For you", bn: "আপনার জন্য" }}
      title={
        <T
          en={`See the ${n} ${n === 1 ? "company" : "companies"}, and why each one fits you`}
          bn={`${n}টি কোম্পানি দেখুন, আর কেন প্রতিটি আপনার সাথে মেলে`}
        />
      }
      lead={
        <T
          en={
            shares > 0
              ? `We found them from ${shares} of your own shares. Premium names them, so you can read about them and follow the ones you like.`
              : "We found them from your own money. Premium names them, so you can read about them and follow the ones you like."
          }
          bn={
            shares > 0
              ? `আপনার নিজের ${shares}টি শেয়ার দেখে এগুলো পেয়েছি। প্রিমিয়ামে নামগুলো দেখবেন, পড়ে দেখতে আর ভালো লাগলে ফলো করতে পারবেন।`
              : "আপনার নিজের টাকার হিসাব দেখে এগুলো পেয়েছি। প্রিমিয়ামে নামগুলো দেখবেন, পড়ে দেখতে আর ভালো লাগলে ফলো করতে পারবেন।"
          }
        />
      }
      cta={{ en: `See my ${n} companies`, bn: `আমার ${n}টি কোম্পানি দেখুন` }}
      context={{
        label: { en: "Based on your shares", bn: "আপনার শেয়ার দেখে বাছাই" },
        stakes: [{ en: `${n} companies picked from your shares`, bn: `আপনার শেয়ার দেখে ${n}টি কোম্পানি বাছাই করা` }],
      }}
    >
      <PremiumTicks items={ticks} />
    </PremiumCard>
  );
}
