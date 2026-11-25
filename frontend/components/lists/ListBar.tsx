"use client";

import type { CSSProperties } from "react";
import { IconChevronDown, IconCompare, IconSearch } from "@/components/ui/icons";
import Chip from "@/components/ui/Chip";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import type { Bi } from "@/lib/lists";

export interface BarOption {
  value: string;
  label: Bi;
  /** How many shares the choice leaves, shown in brackets. */
  count?: number;
}

/**
 * THE bar over every list (2026-11-25, step 4 of the simplify review): the
 * same identical boxes everywhere — Sector · Share price · Sort by — each with
 * its label inside and one chevron, every choice with its count. A list with
 * its own filter adds a row of chips over the boxes (Results: Better ·
 * Uneven …), a long list a search field. Sticky while the shares scroll
 * (`scl-bar`: inside the pop-up on /lists, under the navbar on a page).
 * Presentational: the list (`ListView`, the /lists pop-up) owns the state.
 *
 * A fourth box, Compare (2026-11-25, "Compare and Builder Homes"), switches
 * the rows to ticks; the list shows a tray that opens the comparison. With it
 * the boxes sit two by two on phones (an odd last one spans the row) and in
 * one row from 560px.
 */
export default function ListBar({
  idPrefix,
  sector,
  price,
  sort,
  search,
  chips,
  compare,
  className = "",
}: {
  /** Ids for the label / select pairs, unique on the page. */
  idPrefix: string;
  sector?: { value: string; all: number; options: BarOption[]; onChange: (v: string) => void } | null;
  price?: { value: string; all: number; options: BarOption[]; onChange: (v: string) => void } | null;
  sort?: { value: string; options: BarOption[]; onChange: (v: string) => void } | null;
  search?: { value: string; onChange: (v: string) => void; placeholder: Bi } | null;
  chips?: { value: string; options: BarOption[]; onChange: (v: string) => void } | null;
  /** The Compare switch: on, how many are ticked, and the toggle. */
  compare?: { on: boolean; picked: number; onToggle: () => void } | null;
  className?: string;
}) {
  const { bn } = useLang();
  const t = (b: Bi) => (bn ? b.bn : b.en);
  const withCount = (b: Bi, n?: number) => (n == null ? t(b) : `${t(b)} (${n})`);
  const boxes = [sector, price, sort].filter(Boolean).length;
  const all = boxes + (compare ? 1 : 0);
  const layout = compare
    ? " scl-controls--cmp"
    : `${boxes === 3 ? " scl-controls--3" : ""}${boxes === 1 ? " scl-controls--1" : ""}`;

  return (
    <div className={`scl-bar ${className}`.trim()}>
      {chips && chips.options.length > 1 && (
        <div className="lv-chips" role="group" aria-label={t({ en: "Show", bn: "দেখান" })}>
          {chips.options.map((o) => (
            <Chip key={o.value} active={chips.value === o.value} onClick={() => chips.onChange(o.value)}>
              <T en={o.label.en} bn={o.label.bn} />
              {o.count != null && <span className="lv-chip-n nums">{o.count}</span>}
            </Chip>
          ))}
        </div>
      )}
      {search && (
        <label className="lv-search" htmlFor={`${idPrefix}-q`}>
          <span className="lv-search-ic" aria-hidden="true"><IconSearch size={16} /></span>
          <span className="sr-only">{t(search.placeholder)}</span>
          <input
            id={`${idPrefix}-q`}
            type="search"
            className="lv-search-in"
            value={search.value}
            placeholder={t(search.placeholder)}
            onChange={(e) => search.onChange(e.target.value)}
            autoComplete="off"
          />
        </label>
      )}
      {all > 0 && (
        <div
          className={`scl-controls${layout}`}
          style={compare ? ({ "--n": all } as CSSProperties) : undefined}
        >
          {sector && (
            <label className="scl-ctl" htmlFor={`${idPrefix}-sector`}>
              <span className="scl-ctl-l"><T en="Sector" bn="সেক্টর" /></span>
              <select id={`${idPrefix}-sector`} className="scl-ctl-s" value={sector.value} onChange={(e) => sector.onChange(e.target.value)}>
                <option value="">{withCount({ en: "All sectors", bn: "সব সেক্টর" }, sector.all)}</option>
                {sector.options.map((o) => (
                  <option key={o.value} value={o.value}>{withCount(o.label, o.count)}</option>
                ))}
              </select>
              <span className="scl-ctl-chev" aria-hidden="true"><IconChevronDown size={16} /></span>
            </label>
          )}
          {price && (
            <label className="scl-ctl" htmlFor={`${idPrefix}-price`}>
              <span className="scl-ctl-l"><T en="Share price" bn="শেয়ারের দাম" /></span>
              <select id={`${idPrefix}-price`} className="scl-ctl-s" value={price.value} onChange={(e) => price.onChange(e.target.value)}>
                <option value="">{withCount({ en: "Any price", bn: "যেকোনো দাম" }, price.all)}</option>
                {price.options.map((o) => (
                  <option key={o.value} value={o.value}>{withCount(o.label, o.count)}</option>
                ))}
              </select>
              <span className="scl-ctl-chev" aria-hidden="true"><IconChevronDown size={16} /></span>
            </label>
          )}
          {sort && (
            <label className="scl-ctl scl-ctl--sort" htmlFor={`${idPrefix}-sort`}>
              <span className="scl-ctl-l"><T en="Sort by" bn="ক্রম" /></span>
              <select id={`${idPrefix}-sort`} className="scl-ctl-s" value={sort.value} onChange={(e) => sort.onChange(e.target.value)}>
                {sort.options.map((o) => (
                  <option key={o.value} value={o.value}>{t(o.label)}</option>
                ))}
              </select>
              <span className="scl-ctl-chev" aria-hidden="true"><IconChevronDown size={16} /></span>
            </label>
          )}
          {compare && (
            <button
              type="button"
              className={`scl-ctl scl-ctl--cmp${compare.on ? " is-on" : ""}`}
              aria-pressed={compare.on}
              onClick={compare.onToggle}
            >
              <span className="scl-ctl-l"><T en="Compare" bn="তুলনা" /></span>
              <span className="scl-ctl-v">
                {compare.on
                  ? compare.picked > 0
                    ? t({ en: `${compare.picked} ticked`, bn: `${compare.picked}টি বাছা` })
                    : t({ en: "Tick shares", bn: "শেয়ার বাছুন" })
                  : t({ en: "Pick shares", bn: "শেয়ার বাছুন" })}
              </span>
              <span className="scl-ctl-chev" aria-hidden="true"><IconCompare size={16} /></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
