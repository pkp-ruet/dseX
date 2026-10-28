"use client";

import Link from "next/link";
import type { LatestResultRow } from "@/lib/api";
import { T } from "@/components/i18n/T";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import { RESULT_LEVEL, epsTk, quarterLabel, resultMove } from "@/lib/results";

/**
 * One company's latest quarterly report on /results: company name first, then
 * the level (dot + word), ticker and which report, then "EPS ৳2.10 · a year
 * ago ৳1.80" (labelled — a bare "৳2.10 · was ৳1.80" didn't say what it was);
 * on the right the profit move leads ("+17%", or words for a loss). Taps through to the stock page's results card.
 * `still` renders a plain block (the blurred rows in the locked-filter preview).
 */
export default function ResultRow({ r, still = false }: { r: LatestResultRow; still?: boolean }) {
  const lv = RESULT_LEVEL[r.level];
  const move = resultMove(r);
  const q = quarterLabel(r);
  const hasEps = r.eps_cum != null && r.eps_cum_prev != null;

  const body = (
    <>
      <span className="min-w-0">
        <span className="rs-name">{r.name}</span>
        <span className="rs-meta">
          <span className={`rs-level rs-lv--${r.level}`}>
            <span className="rs-dot" aria-hidden="true" />
            <T en={lv.short} bn={lv.shortBn} />
          </span>
          <span className="rs-sep" aria-hidden="true">·</span>
          <span className="rs-code">{r.code}</span>
          <PersonalMark code={r.code} />
          <span className="rs-sep" aria-hidden="true">·</span>
          <T en={q.en} bn={q.bn} />
        </span>
        {hasEps ? (
          <span className="rs-eps">
            <span>
              <T en="EPS" bn="ইপিএস" />{" "}
              <b>{epsTk(r.eps_cum!)}</b>
            </span>
            <span className="rs-sep" aria-hidden="true">·</span>
            <span>
              <T en="a year ago" bn="এক বছর আগে" />{" "}
              <b>{epsTk(r.eps_cum_prev!)}</b>
            </span>
          </span>
        ) : (r.profit_en || r.profit_bn) && (
          <span className="rs-fallback block">
            <T en={r.profit_en ?? ""} bn={r.profit_bn ?? ""} />
          </span>
        )}
      </span>
      <span className="rs-fig">
        <span className={`rs-move rs-move--${move.tone} ${move.words ? "rs-move--words" : ""}`}>
          {move.words ? <T en={move.en} bn={move.bn} /> : move.en}
        </span>
      </span>
    </>
  );

  if (still) return <div className="rs-row">{body}</div>;
  return (
    <Link href={`/stock/${encodeURIComponent(r.code)}#results`} className="rs-row">
      {body}
    </Link>
  );
}
