"use client";

import type { ReactNode } from "react";
import PageGate from "@/components/premium/PageGate";
import PremiumCard, { PremiumTicks } from "@/components/premium/PremiumCard";
import { T } from "@/components/i18n/T";
import type { L } from "@/lib/learn/types";

/**
 * The rest of an Advanced post (2026-11-25): the first section is free and
 * indexable, everything after it sits in the HTML under one `Locked` (the
 * paywall JSON-LD's `.premium-locked`) and opens for Premium. A reader without
 * Premium gets THE Premium card listing the parts still to read.
 */
export default function LessonGate({ title, parts, children }: { title: L; parts: L[]; children: ReactNode }) {
  return (
    <PageGate
      anchor="lz-premium"
      promo={
        <PremiumCard
          anchor="lz-premium"
          area="learn"
          lock="learn-advanced"
          src="learn-advanced"
          tag={{ en: "Advanced posts", bn: "অ্যাডভান্সড লেখা" }}
          title={<T en="The rest of this post is for Premium members." bn="এই লেখার বাকিটা প্রিমিয়াম সদস্যদের জন্য।" />}
          lead={
            <T
              en="Premium opens every Advanced post, and our analysis of every DSE share."
              bn="প্রিমিয়ামে সব অ্যাডভান্সড লেখা খোলে, সঙ্গে ডিএসইর প্রতিটি শেয়ারের আমাদের বিশ্লেষণ।"
            />
          }
          cta={{ en: "Read the full post", bn: "পুরো লেখা পড়ুন" }}
          context={{ label: { en: `Advanced post: ${title.en}`, bn: `অ্যাডভান্সড লেখা: ${title.bn}` }, stakes: [] }}
        >
          <PremiumTicks items={parts} label={{ en: "Still to read in this post", bn: "এই লেখায় আরও যা আছে" }} />
        </PremiumCard>
      }
    >
      {children}
    </PageGate>
  );
}
