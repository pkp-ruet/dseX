"use client";

import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import type { LatestResultRow } from "@/lib/api";
import ResultRow from "./ResultRow";

const PREVIEW_ROWS = 3;

/**
 * What a locked filter would show a free reader (2026-10-28): the filter in
 * one line, how many reports it holds and the first three with the company
 * hidden (the shared row-lock preview — level, quarter, EPS and the move
 * shown), with one button to /premium. Same idea as the screener's locked-answer preview —
 * the reader sees their own question answered, not a list of features.
 * Screen-only like every lock: the rows are in the HTML.
 */
export default function ResultsFilterPreview({
  open,
  onClose,
  title,
  line,
  count,
  countLabel,
  rows,
  empty,
  onCta,
  t,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  line: string;
  count: number;
  countLabel: string;
  rows: LatestResultRow[];
  /** Shown instead of the rows when the filter holds none. */
  empty: string;
  onCta: () => void;
  t: (en: string, bn: string) => string;
}) {
  const shown = rows.slice(0, PREVIEW_ROWS);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex w-full gap-2">
          <Button variant="quiet" className="flex-1" onClick={onClose}>
            {t("Not now", "এখন না")}
          </Button>
          <Button href="/premium" variant="primary" className="flex-1" onClick={onCta}>
            {t("See them with Premium", "প্রিমিয়ামে দেখুন")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">{line}</p>
        <div className="rs-preview-count">
          <span className="rs-preview-n">{count}</span>
          <span className="text-sm text-text-muted">{countLabel}</span>
        </div>
        {shown.length > 0 ? (
          <div className="rs-preview-rows">
            <ul className="rs-list">
              {shown.map((r) => (
                <li key={r.code}>
                  <ResultRow r={r} masked />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-text-muted">{empty}</p>
        )}
        <p className="text-xs text-text-muted">
          {t(
            "Premium opens every filter and every company's latest results.",
            "প্রিমিয়ামে সব বাছাই আর প্রতিটি কোম্পানির সর্বশেষ ফল খোলা থাকে।",
          )}
        </p>
      </div>
    </Sheet>
  );
}
