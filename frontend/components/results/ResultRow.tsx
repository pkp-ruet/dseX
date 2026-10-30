"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LatestResultRow } from "@/lib/api";
import { T } from "@/components/i18n/T";
import MaskedName from "@/components/premium/MaskedName";
import { Locked } from "@/components/premium/AnswerLock";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import { RESULT_LEVEL, epsTk, quarterLabel, resultMove } from "@/lib/results";

/**
 * One company's latest quarterly report on /results: company name first, then
 * the level (dot + word), ticker and which report, then "EPS ৳2.10 · a year
 * ago ৳1.80" (labelled — a bare "৳2.10 · was ৳1.80" didn't say what it was);
 * on the right the profit move leads ("+17%", or words for a loss). Taps through to the stock page's results card.
 * `masked` = a free reader's preview of a locked row (premium/RowLock, the
 * locked-filter preview): level, quarter, EPS and the move shown, the company
 * hidden; a plain block, not a link.
 * What the report means (`meaning_en`) is the Premium line under it since
 * 2026-10-29, and since 2026-10-31 whether the latest quarter came in above or
 * below the year's own pace (`pace`) — always in the HTML, shown to Premium
 * readers only (`Locked`).
 * `mark` replaces the page's H / ★ tag (the dashboard passes its `OwnerMark`,
 * which reads the bundle's sets instead of `PersonalCodesProvider`).
 * Also the rows of the dashboard's results card (`ResultsPromoCard`).
 */
export default function ResultRow({
  r, masked = false, mark,
}: { r: LatestResultRow; masked?: boolean; mark?: ReactNode }) {
  const lv = RESULT_LEVEL[r.level];
  const move = resultMove(r);
  const q = quarterLabel(r);
  const hasEps = r.eps_cum != null && r.eps_cum_prev != null;

  const body = (
    <>
      <span className="min-w-0">
        {masked ? <MaskedName name={r.name} /> : <span className="rs-name">{r.name}</span>}
        <span className="rs-meta">
          <span className={`rs-level rs-lv--${r.level}`}>
            <span className="rs-dot" aria-hidden="true" />
            <T en={lv.short} bn={lv.shortBn} />
          </span>
          {!masked && (
            <>
              <span className="rs-sep" aria-hidden="true">·</span>
              <span className="rs-code">{r.code}</span>
              {mark !== undefined ? mark : <PersonalMark code={r.code} />}
            </>
          )}
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
        {!masked && (r.meaning_en || r.pace) && (
          <Locked as="span" className="rs-meaning">
            {r.meaning_en && <T en={r.meaning_en} bn={r.meaning_bn || r.meaning_en} />}
            {r.pace && (
              <span className={`rs-pace rs-pace--${r.pace.word}`}>
                <T en={r.pace.headline_en} bn={r.pace.headline_bn} />{" "}
                <T en={r.pace.en} bn={r.pace.bn || r.pace.en} />
              </span>
            )}
          </Locked>
        )}
      </span>
      <span className="rs-fig">
        <span className={`rs-move rs-move--${move.tone} ${move.words ? "rs-move--words" : ""}`}>
          {move.words ? <T en={move.en} bn={move.bn} /> : move.en}
        </span>
      </span>
    </>
  );

  if (masked) return <div className="rs-row">{body}</div>;
  return (
    <Link href={`/stock/${encodeURIComponent(r.code)}#results`} className="rs-row">
      {body}
    </Link>
  );
}
