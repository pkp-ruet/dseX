"use client";

import { useLockScope } from "@/components/premium/LockScope";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { usePremium } from "@/lib/premium";

/**
 * The analysis's one Premium mark, at the top of the summary (it replaced the
 * "Your full report" band, 2026-11-05): "Premium" for a member,
 * "Free analysis · 4 of 10 this month" for one of the
 * reader's free analyses (the page opens them by itself since 2026-11-08, so
 * the count is how they learn the limit). The parts carry no labels.
 */
export default function AnalysisBadge() {
  const { isPremium } = usePremium();
  const { user } = useAuth();
  const scope = useLockScope();
  const keys = user?.report_keys;
  return (
    <span className="an-badge">
      <IconCrown size={13} />
      {isPremium ? (
        <T en="Premium" bn="প্রিমিয়াম" />
      ) : keys && keys.used > 0 ? (
          <T
            en={`Free analysis · ${Math.min(keys.used, keys.per_month)} of ${keys.per_month} this month`}
            bn={`ফ্রি বিশ্লেষণ · এ মাসে ${keys.per_month}টির ${Math.min(keys.used, keys.per_month)}টি`}
          />
      ) : (
        <T en="Your free analysis" bn="আপনার ফ্রি বিশ্লেষণ" />
      )}
    </span>
  );
}
