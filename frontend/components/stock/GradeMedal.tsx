"use client";

import ScoreBadge from "@/components/ui/ScoreBadge";
import { IconChevronDown, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { getTier, TIER_LABELS, TIER_LABELS_BN } from "@/lib/constants";
import { ANALYSIS_ID } from "@/lib/stock-report";

/**
 * Our grade on the cover (2026-11-05, user decision: the grade, score and rank
 * are free — they already were in the sticky bar and on the ranking). The
 * score ring, the group word in its colour, the rank on the DSE, and a link:
 * down to our analysis for a reader who has it, to the Premium card for one
 * who doesn't. The reason for the grade stays Premium.
 */
export default function GradeMedal({
  score,
  rank,
  total,
}: {
  score: number | null;
  rank: number | null;
  total: number | null;
}) {
  const open = usePremiumOpen();
  if (score == null) {
    return (
      <div className="cv-medal" data-tier="none">
        <span className="min-w-0">
          <span className="block text-xs font-bold text-text-main">
            <T en="Our grade" bn="আমাদের গ্রেড" />
          </span>
          <b className="block text-lg font-bold leading-tight text-text-main">
            <T en="Not graded yet" bn="এখনো গ্রেড দেওয়া হয়নি" />
          </b>
          <span className="block text-sm text-text-main">
            <T en="We grade a company once it has enough audited accounts." bn="যথেষ্ট নিরীক্ষিত হিসাব থাকলে তবেই আমরা গ্রেড দিই।" />
          </span>
        </span>
      </div>
    );
  }
  const tier = getTier(score);
  return (
    <a href={open ? `#${ANALYSIS_ID}` : "#ch-premium"} className="cv-medal" data-tier={tier}>
      <ScoreBadge score={score} size="md" />
      <span className="min-w-0">
        <span className="block text-xs font-bold text-text-main">
          <T en="Our grade" bn="আমাদের গ্রেড" />
        </span>
        <b className="cv-medal-word">
          <T en={TIER_LABELS[tier]} bn={TIER_LABELS_BN[tier]} />
        </b>
        {rank != null && total != null && (
          <span className="block text-sm font-semibold text-text-main nums">
            <T en={`No. ${rank} of ${total} on the DSE`} bn={`ডিএসইর ${total}টির মধ্যে ${rank} নম্বরে`} />
          </span>
        )}
        <span className="cv-medal-go">
          {open ? (
            <T en="See our analysis" bn="আমাদের বিশ্লেষণ দেখুন" />
          ) : (
            <>
              <IconCrown size={14} />
              <T en="See why · Premium" bn="কেন, দেখুন · প্রিমিয়াম" />
            </>
          )}
          <IconChevronDown size={14} />
        </span>
      </span>
    </a>
  );
}
