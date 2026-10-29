import PfCard from "./PfCard";
import AnswerLock, { BRIEF_CARD } from "@/components/premium/AnswerLock";
import type { GradeLift } from "@/lib/portfolio-next";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

/**
 * "What would raise your grade" (2026-10-26, `gradeLifts`): the same grade
 * re-run on a copy of the portfolio after one change, kept only when it goes
 * up. Grade before → after, then the sub-scores that move. Renders nothing
 * when no single change helps.
 */
export default function GradeLiftCard({ lifts, lang }: { lifts: GradeLift[]; lang: AnalysisLang }) {
  if (lifts.length === 0) return null;
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const n = lifts.length;
  const from = lifts[0].fromGrade;

  return (
    <PfCard
      title={L("What would raise your grade", "কী করলে গ্রেড বাড়বে")}

      note={L(
        "Each line is one change, checked with the same grade as above, at today's prices.",
        "প্রতিটি লাইন একটি পরিবর্তন, আজকের দামে ওপরের একই গ্রেড দিয়ে যাচাই করা।",
      )}
      lang={lang}
      dataCard="grade-lift"
    >
      <AnswerLock
        job="watch" brief={BRIEF_CARD}
        lock="Portfolio: grade lifts"
        lines={[
          {
            en: `${n} change${n === 1 ? "" : "s"} that would lift your grade from ${from}, and to what`,
            bn: `${n}টি পরিবর্তন যা আপনার গ্রেড ${from} থেকে বাড়াবে, আর কতটা`,
          },
          { en: "Which of your three scores each change moves", bn: "প্রতিটি পরিবর্তনে আপনার তিনটি স্কোরের কোনটি বদলায়" },
        ]}
      >
      <ul className={`pf-rows ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        {lifts.map((l) => (
          <li key={l.label} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="flex shrink-0 items-center gap-2" aria-label={`${l.fromGrade} → ${l.toGrade}`}>
              <span className={`pf-grade-letter pf-g-${l.fromGrade} opacity-60`}>{l.fromGrade}</span>
              <span className="text-text-muted" aria-hidden>→</span>
              <span className={`pf-grade-letter pf-g-${l.toGrade}`}>{l.toGrade}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text-main">{l.label}</span>
              {l.changes.length > 0 && (
                <span className="pf-num mt-0.5 block text-xs text-text-muted">
                  {l.changes
                    .map((c) => `${c.label} ${c.from.toFixed(1)} → ${c.to.toFixed(1)}`)
                    .join(" · ")}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      </AnswerLock>
      <p className="pf-fine">
        {L(
          "An example to show what moves the grade, not a recommendation to trade. Fees and tax are not included.",
          "গ্রেড কীসে বদলায় তা দেখানোর উদাহরণ, লেনদেনের পরামর্শ নয়। খরচ ও কর ধরা হয়নি।",
        )}
      </p>
    </PfCard>
  );
}
