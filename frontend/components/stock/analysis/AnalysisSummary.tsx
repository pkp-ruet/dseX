import ScoreBadge from "@/components/ui/ScoreBadge";
import { IconChevronDown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import AnalysisBadge from "@/components/stock/analysis/AnalysisBadge";
import { DateT, ToneChip, money, tx } from "@/components/stock/report/fmt";
import { getTier } from "@/lib/constants";
import {
  ANALYSIS_ALIASES, ANALYSIS_ID, CONCLUSION_ID, PART_ID,
  type StockAnalysis, type StockAnswer, type StockReport,
} from "@/lib/stock-report";

/**
 * "Our analysis" — the report's first card (2026-11-05, user: "it starts with
 * 'Should you buy it today?'. it must be our analysis on the stock"). Our
 * grade with where it stands on the DSE, three or four short sentences that
 * sum the company up (backend `stock_analysis.build_analysis`), one tile per
 * part (word + one key figure, each a jump to its part), and one quiet line
 * that jumps down to our conclusion. Premium, like the whole report.
 */
export default function AnalysisSummary({
  analysis,
  answer,
  updated,
  name,
}: {
  analysis: StockAnalysis;
  answer: StockAnswer | null;
  updated: StockReport["updated"];
  name: string;
}) {
  const g = analysis.grade;
  const tier = getTier(g.score);
  return (
    <section id={ANALYSIS_ID} className="stock-anchor soft-card an-card" aria-labelledby="an-sum-t">
      {ANALYSIS_ALIASES.map((a) => (
        <span key={a} id={a} className="stock-anchor block" aria-hidden="true" />
      ))}
      <p className="an-eyebrow">
        <AnalysisBadge />
        <span>
          <T en={`Our analysis of ${name}`} bn={`${name}: আমাদের বিশ্লেষণ`} />
          {updated && (
            <>
              {" · "}
              <T en="updated " bn="হালনাগাদ " />
              <DateT iso={updated.date} />
              {", "}
              {tx(updated.reason)}
            </>
          )}
        </span>
      </p>

      <div className="an-head">
        <ScoreBadge score={g.score} size="md" />
        <div className="min-w-0">
          <span className="block text-xs font-bold text-text-main">
            <T en="Our grade" bn="আমাদের গ্রেড" />
          </span>
          <h2 id="an-sum-t" className="an-grade" data-tier={g.score == null ? undefined : tier}>
            {tx(g.word)}
          </h2>
          {(g.line || g.rank) && (
            <p className="m-0 mt-1 text-sm font-semibold text-text-main nums">
              {tx(g.line)}
              {g.line && g.rank != null && ". "}
              {g.rank != null && g.total != null && (
                <T en={`No. ${g.rank} of ${g.total}.`} bn={`${g.total}টির মধ্যে ${g.rank} নম্বরে।`} />
              )}
            </p>
          )}
        </div>
      </div>
      {g.checks && <p className="m-0 mt-3 text-sm text-text-main">{tx(g.checks)}</p>}

      {analysis.summary && <p className="an-text">{tx(analysis.summary)}</p>}

      <div className="an-tiles">
        {analysis.parts.map((p, i) => (
          <a key={p.key} href={`#${PART_ID(p.key)}`} className="an-tile" data-tone={p.tone}>
            <span className="an-tile-k">
              {tx(p.name)}
              <span aria-hidden="true">{i + 1}</span>
            </span>
            <span className="an-tile-w">{tx(p.word)}</span>
            <span className="an-tile-v">{tx(p.tile)}</span>
          </a>
        ))}
      </div>
      <p className="an-note">
        <T
          en="The grade comes from the first four. The price and the safety checks are judged on their own."
          bn="গ্রেড আসে প্রথম চারটি থেকে। দাম আর নিরাপত্তার যাচাই আলাদাভাবে বিচার করা হয়।"
        />
      </p>

      {answer && (
        <a href={`#${CONCLUSION_ID}`} className="an-to-concl">
          <T en="Our conclusion" bn="আমাদের সিদ্ধান্ত" />
          <ToneChip word={answer.word} tone={answer.tone} />
          {answer.buy_price != null && (
            <span className="nums">
              <T en={`under ${money(answer.buy_price)}`} bn={`${money(answer.buy_price)}-এর নিচে`} />
            </span>
          )}
          <span className="an-to-concl-go">
            <T en="See why" bn="কেন, দেখুন" />
            <IconChevronDown size={14} />
          </span>
        </a>
      )}
    </section>
  );
}
