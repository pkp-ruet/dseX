"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import TierPill from "@/components/ui/TierPill";
import { IconChevronDown } from "@/components/ui/icons";
import MaskedName from "@/components/premium/MaskedName";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import { changePct, changeTone, money } from "@/lib/formatters";
import { sectorBn } from "@/lib/bn";
import type { Bi, ListRow } from "@/lib/lists";

const TONE_CLASS: Record<string, string> = {
  positive: "text-positive",
  negative: "text-negative",
  watch: "text-watch",
  gold: "text-gold-ink",
  "": "",
};

/** Rows per "Show more". */
export const LIST_PAGE = 30;

export interface ListGroup {
  id: string;
  title: Bi;
  line?: Bi | null;
  /** An id on the heading, so a link can jump to the group. */
  anchor?: string;
}

/**
 * THE rows of every list (2026-11-25, step 4 of the simplify review; the
 * design is the screener pop-up's of 2026-11-24, "clean and easy to read"):
 * **#** · **Company** (name + "New" + the reader's H / ★, then code · sector ·
 * our group, then why it is on the list, then the list's own lines) ·
 * **Price today** (under the key figure on phones) · **the key figure** big,
 * its plain name once in the header. `limit` rows, then "Show more".
 *
 * Modes:
 * - a link to the stock page (default);
 * - `renderOpen` — a tap opens the row's panel in place (the Buy List's case,
 *   the screener's quick look, For you's why), one open at a time;
 * - `masked` — a reader without Premium: the figures and the reason, the
 *   company a grey bar (never a name, code, price or link; `maskKeepSector`
 *   keeps the business, which For you showed free);
 * - `allInHtml` — every row is in the HTML for search, the ones past `limit`
 *   `hidden` until "Show all" (the ranking).
 * `groupOf` puts a heading over each run of rows that share one (Results by
 * day, For you by share); the list passes it only in its own order.
 */
export default function ListRows<T>({
  rows,
  figHead,
  limit,
  onMore,
  moreLabel,
  allInHtml = false,
  masked = false,
  maskKeepSector = false,
  showPrice = true,
  renderLines,
  renderOpen,
  defaultOpen = null,
  onToggle,
  onLeave,
  groupOf,
  rowId,
}: {
  rows: ListRow<T>[];
  figHead: Bi;
  limit: number;
  onMore?: () => void;
  moreLabel?: (left: number) => Bi;
  allInHtml?: boolean;
  masked?: boolean;
  maskKeepSector?: boolean;
  showPrice?: boolean;
  renderLines?: (row: ListRow<T>) => ReactNode;
  renderOpen?: (row: ListRow<T>) => ReactNode;
  defaultOpen?: string | null;
  onToggle?: (code: string, open: boolean) => void;
  /** Runs before a tap leaves for the stock page (the list remembers the row). */
  onLeave?: (code: string) => void;
  groupOf?: (row: ListRow<T>) => ListGroup | null;
  rowId?: (row: ListRow<T>) => string;
}) {
  const [openCode, setOpenCode] = useState<string | null>(defaultOpen);
  useEffect(() => {
    if (defaultOpen) setOpenCode(defaultOpen);
  }, [defaultOpen]);
  const drawn = allInHtml ? rows : rows.slice(0, limit);
  const left = rows.length - Math.min(rows.length, limit);
  const idOf = rowId ?? ((r: ListRow<T>) => `scl-${r.code}`);
  const toggle = (code: string) => {
    const next = openCode === code ? null : code;
    setOpenCode(next);
    onToggle?.(code, next === code);
  };

  let lastGroup: string | null = null;
  return (
    <div className={`scl${masked ? " scl--masked" : ""}`}>
      <div className="scl-head" aria-hidden="true">
        <span className="scl-h-rank">#</span>
        <span className="scl-h-main"><T en="Company" bn="কোম্পানি" /></span>
        <span className="scl-h-px">{masked || !showPrice ? null : <T en="Price today" bn="আজকের দাম" />}</span>
        <span className="scl-h-fig"><T en={figHead.en} bn={figHead.bn} /></span>
      </div>
      <ol className="scl-list">
        {drawn.map((r, i) => {
          const hide = allInHtml && i >= limit;
          const g = groupOf?.(r) ?? null;
          const head = g && g.id !== lastGroup ? g : null;
          if (g) lastGroup = g.id;
          const isOpen = !!renderOpen && openCode === r.code && !masked;
          const fig = r.fig;
          const sector = r.sector ? <span className="scl-sector"><T en={r.sector} bn={sectorBn(r.sector)} /></span> : null;

          const inner = (
            <>
              <span className="scl-rank nums">{r.rank ?? i + 1}</span>
              <span className="scl-main">
                <span className="scl-name">
                  {masked ? <MaskedName name={r.name} /> : <span className="scl-name-t">{r.name}</span>}
                  {!masked && <PersonalMark code={r.code} />}
                  {r.isNew && <span className="scr-new"><T en="New" bn="নতুন" /></span>}
                </span>
                <span className="scl-meta">
                  {!masked && <span className="scl-code">{r.code}</span>}
                  {(!masked || maskKeepSector) && sector}
                  {r.tier && <TierPill tier={r.tier} />}
                </span>
                {r.why && <span className="scl-why"><T en={r.why.en} bn={r.why.bn} /></span>}
                {renderLines?.(r)}
              </span>
              {!masked && showPrice && (
                <span className="scl-px nums">
                  <span className="scl-px-v">{money(r.price ?? null)}</span>
                  {r.change != null && <span className={`scl-px-c ${changeTone(r.change)}`}>{changePct(r.change)}</span>}
                </span>
              )}
              <span className="scl-fig">
                <span className={`scl-fig-v nums ${TONE_CLASS[fig?.tone ?? ""]}${fig?.words ? " is-words" : ""}`}>
                  {fig ? (fig.en === fig.bn ? fig.en : <T en={fig.en} bn={fig.bn} />) : "—"}
                </span>
                {renderOpen && !masked && (
                  <span className={`scl-chev${isOpen ? " is-open" : ""}`} aria-hidden="true">
                    <IconChevronDown size={16} />
                  </span>
                )}
              </span>
            </>
          );

          return (
            <Fragment key={r.code}>
              {head && (
                <li className="lv-group" id={head.anchor} hidden={hide || undefined}>
                  <span className="lv-group-t"><T en={head.title.en} bn={head.title.bn} /></span>
                  {head.line && <span className="lv-group-l"><T en={head.line.en} bn={head.line.bn} /></span>}
                </li>
              )}
              <li id={idOf(r)} className={`scl-row${isOpen ? " is-open" : ""}`} hidden={hide || undefined}>
                {masked ? (
                  <div className="scl-link">{inner}</div>
                ) : renderOpen ? (
                  <button
                    type="button"
                    className="scl-link"
                    aria-expanded={isOpen}
                    aria-controls={`${idOf(r)}-open`}
                    onClick={() => toggle(r.code)}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link
                    href={`/stock/${encodeURIComponent(r.code)}${r.hash ?? ""}`}
                    className="scl-link"
                    onClick={() => onLeave?.(r.code)}
                  >
                    {inner}
                  </Link>
                )}
                {isOpen && (
                  <div id={`${idOf(r)}-open`} className="lv-open">
                    {renderOpen!(r)}
                  </div>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
      {left > 0 && onMore && (
        <div className="scl-more">
          <Button variant="quiet" onClick={onMore}>
            {moreLabel ? (
              <T en={moreLabel(left).en} bn={moreLabel(left).bn} />
            ) : (
              <T en={`Show ${Math.min(left, LIST_PAGE)} more of ${left}`} bn={`আরও ${Math.min(left, LIST_PAGE)}টি দেখুন (বাকি ${left}টি)`} />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
