"use client";

import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import PremiumCard, { PremiumTicks } from "@/components/premium/PremiumCard";
import { T } from "@/components/i18n/T";

/**
 * The Premium wall (2026-11-23, user: "free user see the whole thing for the
 * first time but build again will open a premium wall for them"). Opens over
 * the free plan from Build again, "Not for me" or a new answer. The plan
 * stays theirs: "Keep my plan" closes it.
 */
export default function BuilderWall({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={<T en="You've used your free plan" bn="ফ্রি পরিকল্পনা ব্যবহার করেছেন" />}
      footer={
        <Button variant="quiet" size="lg" block onClick={onClose}>
          <T en="Keep my plan" bn="আমার পরিকল্পনাই থাক" />
        </Button>
      }
    >
      <PremiumCard
        className="pc--compact"
        anchor="pb-premium"
        area="portfolio-builder"
        lock="builder-again"
        src="builder-again"
        tag={{ en: "Portfolio builder", bn: "পোর্টফোলিও বানান" }}
        title={<T en="Build as many plans as you want" bn="যতবার চান, ততবার পরিকল্পনা বানান" />}
        lead={
          <T
            en="Your free plan stays yours. With Premium you can start over as often as you like."
            bn="আপনার ফ্রি পরিকল্পনা আপনারই থাকবে। প্রিমিয়ামে যতবার ইচ্ছা নতুন করে শুরু করতে পারবেন।"
          />
        }
        cta={{ en: "Build again with Premium", bn: "প্রিমিয়ামে আবার বানান" }}
        context={{
          label: { en: "Portfolio builder: build again", bn: "পোর্টফোলিও বানান: আবার বানান" },
          stakes: [{ en: "Your free plan is used", bn: "ফ্রি পরিকল্পনা ব্যবহার হয়েছে" }],
        }}
      >
        <PremiumTicks
          items={[
            { en: "Build again, as many times as you want", bn: "যতবার চান, আবার বানান" },
            { en: "Try another amount, purpose or kind of company", bn: "অন্য টাকা, অন্য লক্ষ্য বা অন্য ধরনের কোম্পানি দিয়ে দেখুন" },
            { en: "Swap any share you don't want", bn: "যে শেয়ার পছন্দ নয়, বদলে নিন" },
            { en: "Your last 10 plans kept", bn: "শেষ 10টি পরিকল্পনা জমা থাকে" },
          ]}
        />
      </PremiumCard>
    </Sheet>
  );
}
