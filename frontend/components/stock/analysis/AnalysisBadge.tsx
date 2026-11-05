"use client";

import { useLockScope } from "@/components/premium/LockScope";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { usePremium } from "@/lib/premium";

/**
 * The analysis's one Premium mark, at the top of the summary (it replaced the
 * "Your full report" band, 2026-11-05): "Premium" for a member, "Free today"
 * for today's free report, "Your free report" for a report key. The parts
 * themselves carry no labels.
 */
export default function AnalysisBadge() {
  const { isPremium } = usePremium();
  const scope = useLockScope();
  return (
    <span className="an-badge">
      <IconCrown size={13} />
      {isPremium ? (
        <T en="Premium" bn="প্রিমিয়াম" />
      ) : scope?.reason === "key" ? (
        <T en="Your free report" bn="আপনার ফ্রি রিপোর্ট" />
      ) : (
        <T en="Free today" bn="আজ ফ্রি" />
      )}
    </span>
  );
}
