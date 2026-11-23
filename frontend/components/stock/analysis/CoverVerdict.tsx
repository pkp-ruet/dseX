"use client";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { Locked } from "@/components/premium/AnswerLock";
import { OpenScope, useLockScope } from "@/components/premium/LockScope";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { tx } from "@/components/stock/report/fmt";
import { getTier, TIER_LABELS, TIER_LABELS_BN } from "@/lib/constants";
import { ANALYSIS_ID, type VerdictRow } from "@/lib/stock-report";

function Row({ row, score }: { row: VerdictRow; score?: number | null }) {
  return (
    <li className="cv-vrow">
      <span className="cv-v-label">{tx(row.label)}</span>
      <span className="cv-v-val">
        <span className="cv-v-word" data-tone={row.tone}>{tx(row.word)}</span>
        {row.line && <span className="cv-v-line">{tx(row.line)}</span>}
      </span>
      {score != null && <ScoreBadge score={score} size="sm" />}
    </li>
  );
}

function LockedRow({ row }: { row: VerdictRow }) {
  return (
    <li className="cv-vrow">
      <span className="cv-v-label">{tx(row.label)}</span>
      <a href="#ch-premium" className="cv-v-lock">
        <IconLock size={13} />
        <T en="Premium" bn="প্রিমিয়াম" />
      </a>
    </li>
  );
}

/**
 * Our verdict on the cover (2026-11-24, user: "the philosophy of a stock page
 * should be only analysis … what's good or bad we think about the company,
 * what we think about current price"; mockup
 * https://claude.ai/artifact/2shfh7wSivDZXcExSTabQB). Four rows: the company
 * (our grade, free — it always was), its dividend, today's price and problems
 * (open to whoever can see our analysis, else a gold lock each). Replaced the
 * grade medal, the Buy / Sell split and the six part words. The open rows are
 * always in the HTML under `Locked`, so a Premium reader sees them from the
 * first paint.
 */
export default function CoverVerdict({ rows, score }: { rows: VerdictRow[] | null; score: number | null }) {
  const open = usePremiumOpen();
  const opening = !!useLockScope()?.opening;
  const tier = getTier(score);
  const company: VerdictRow =
    rows?.find((r) => r.key === "company") ??
    (score == null
      ? {
          key: "company",
          label: { en: "The company", bn: "কোম্পানি" },
          word: { en: "Not graded yet", bn: "এখনো গ্রেড দেওয়া হয়নি" },
          tone: "neutral",
          line: { en: "We grade a company once it has enough audited accounts", bn: "যথেষ্ট নিরীক্ষিত হিসাব থাকলে তবেই আমরা গ্রেড দিই" },
        }
      : { key: "company", label: { en: "The company", bn: "কোম্পানি" }, word: { en: TIER_LABELS[tier], bn: TIER_LABELS_BN[tier] }, tone: "neutral", line: null });
  const rest = (rows ?? []).filter((r) => r.key !== "company");
  return (
    <div className="cv-verdict">
      <p className="cv-v-k">
        <a href={`#${ANALYSIS_ID}`}>
          <T en="Our verdict" bn="আমাদের মূল্যায়ন" />
        </a>
      </p>
      <ul className="cv-vrows">
        <Row row={company} score={score} />
      </ul>
      {rest.length > 0 && !open && !opening && (
        <ul className="cv-vrows pl-free">
          {rest.map((r) => (
            <LockedRow key={r.key} row={r} />
          ))}
        </ul>
      )}
      {rest.length > 0 && (
        <Locked>
          <OpenScope>
            <ul className="cv-vrows">
              {rest.map((r) => (
                <Row key={r.key} row={r} />
              ))}
            </ul>
          </OpenScope>
        </Locked>
      )}
    </div>
  );
}
