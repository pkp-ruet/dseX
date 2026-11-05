import type { CSSProperties, ReactNode } from "react";
import { IconAlert, IconCalendar } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { ToneChip, tx } from "@/components/stock/report/fmt";
import { PART_ALIASES, PART_ID, type AnalysisPart as Part, type AnalysisLine } from "@/lib/stock-report";

const MARK: Record<AnalysisLine["tone"], string> = { good: "✓", fair: "!", bad: "✕", neutral: "–", info: "i" };

/** A part's list: one fact a line, marked ✓ / ! / ✕ / i. */
export function AnalysisList({ lines }: { lines: AnalysisLine[] }) {
  if (!lines.length) return null;
  return (
    <ul className="an-list">
      {lines.map((l, i) => (
        <li key={i}>
          <span className="an-mk" data-tone={l.tone} aria-hidden="true">{MARK[l.tone]}</span>
          <span>{tx(l.text)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * ONE part of our analysis (2026-11-05, user: "hard language, complex
 * presentation, lots of hidden figures"): the same shape for all six — the
 * number, name and question with its word as a chip; the answer; three
 * numbers in the open; the ✓ / ! / ✕ list; one watch line, dated callout or
 * note; the picture beside it on wide screens; anything longer under it; the
 * source. Nothing folds.
 */
export default function AnalysisPart({
  part,
  index,
  picture,
  extra,
}: {
  part: Part;
  index: number;
  picture?: ReactNode;
  extra?: ReactNode;
}) {
  const id = PART_ID(part.key);
  const n = part.stats.length;
  return (
    <section id={id} className="stock-anchor soft-card an-card" aria-labelledby={`${id}-t`}>
      {PART_ALIASES[part.key].map((a) => (
        <span key={a} id={a} className="stock-anchor block" aria-hidden="true" />
      ))}
      <header className="an-part-head">
        <span className="an-n" aria-hidden="true">{index + 1}</span>
        <h2 id={`${id}-t`}>{tx(part.name)}</h2>
        <p className="an-q">{tx(part.question)}</p>
        <ToneChip word={part.word} tone={part.tone} size="lg" />
      </header>

      <div className="an-body" data-pic={picture ? "true" : undefined}>
        <div className="min-w-0">
          <p className="an-answer">{tx(part.answer)}</p>
          {n > 0 && (
            <div className="an-stats" style={{ "--n": n } as CSSProperties}>
              {part.stats.map((s, i) => (
                <div key={i}>
                  <b className="nums">{tx(s.value)}</b>
                  <span>{tx(s.label)}</span>
                </div>
              ))}
            </div>
          )}
          <AnalysisList lines={part.checks} />
          {part.watch && (
            <p className="an-watch">
              <IconAlert size={18} />
              <span>{tx(part.watch)}</span>
            </p>
          )}
          {part.callout && (
            <p className="an-callout">
              <IconCalendar size={18} />
              <span>{tx(part.callout)}</span>
            </p>
          )}
          {part.note && part.key !== "profit" && <p className="an-aside">{tx(part.note)}</p>}
        </div>
        {picture && <div className="an-pic">{picture}</div>}
      </div>

      {extra && <div className="an-extra">{extra}</div>}

      {part.source && (
        <p className="an-src">
          <T en="Source: " bn="উৎস: " />
          {tx(part.source)}
        </p>
      )}
    </section>
  );
}
