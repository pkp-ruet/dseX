"use client";

import { Fragment, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { TIER_LABELS, TIER_MEANINGS, TIER_VAR, type TierKey } from "@/lib/constants";
import StarButton from "@/components/ui/StarButton";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { SortIcon, type SortDir } from "@/components/ui/Table";
import RankRowDetails, { pillarValues } from "@/components/ranking/RankRowDetails";
import { changePct, changeTone, money } from "@/lib/formatters";
import { pillarColor } from "@/lib/insight-utils";
import { PILLARS } from "@/lib/landing";
import type { ScoreItem } from "@/lib/api";
import EmptyState from "@/components/ui/EmptyState";

export interface RankedItem extends ScoreItem {
  tier: TierKey;
}

export interface RankedRow {
  item: RankedItem;
  rank: number;
}

export type RankSortCol = "rank" | "name" | "value" | "growth" | "dividend";
export interface RankSort {
  col: RankSortCol;
  dir: SortDir;
}

interface Props {
  /** Already filtered + globally-ranked rows, in display order. */
  rows: RankedRow[];
  /** Score order → rows sit under their grade's header. Any other sort → one flat list. */
  grouped: boolean;
  sort: RankSort;
  onSort: (col: RankSortCol) => void;
}

const TIERS_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

const COL_COUNT = 10;

/**
 * "Price today" — the valuation check as one word. Same bands as the Buy/Sell
 * signal's valuation fork (p4_val ≥7 cheap, <4 expensive), so the word never
 * disagrees with a signal elsewhere on the site.
 */
export function priceWord(p4: number | null | undefined): { label: string; tone: string } | null {
  if (p4 == null) return null;
  if (p4 >= 7) return { label: "Good price", tone: "text-positive" };
  if (p4 >= 4) return { label: "Fair price", tone: "text-tier-average" };
  return { label: "Expensive", tone: "text-watch" };
}

/** Five tiny bars — what the score is made of, readable at a glance. */
function CheckBars({ item }: { item: RankedItem }) {
  const values = pillarValues(item);
  if (values.every((v) => v == null)) return <span className="text-text-muted">—</span>;
  const label = PILLARS.map((p, i) => `${p.short} ${values[i] == null ? "no data" : values[i]!.toFixed(1)}`).join(", ");
  return (
    <span className="rk-bars" role="img" aria-label={`Five checks out of 10: ${label}`}>
      {values.map((v, i) => (
        <span key={PILLARS[i].key} className="rk-bar">
          {v != null && (
            <span
              className="rk-bar-fill"
              style={{ height: `${Math.max(12, Math.min(100, v * 10))}%`, background: pillarColor(v) }}
            />
          )}
        </span>
      ))}
    </span>
  );
}

const FLAG_NOTES = {
  Z: "Z category — the company has paid irregular dividends or none, and its shares carry extra trading limits. Its score is pulled down for this.",
  B: "B category — the dividend record is below par.",
};

/**
 * A warning tag beside the name. The explanation used to sit in a `title`
 * tooltip, which never appears on a phone — so the tag is a button that opens
 * one plain line under the name.
 */
function FlagTag({ label, note }: { label: string; note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="rk-flag"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && <span className="rk-flag-note">{note}</span>}
    </>
  );
}

function HeadCell({
  col,
  label,
  sort,
  onSort,
  className = "",
}: {
  col: RankSortCol;
  label: string;
  sort: RankSort;
  onSort: (col: RankSortCol) => void;
  className?: string;
}) {
  const active = sort.col === col;
  return (
    <th
      scope="col"
      className={`rk-th ${className}`.trim()}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button type="button" className={`rk-th-btn${active ? " is-active" : ""}`} onClick={() => onSort(col)}>
        {label}
        <SortIcon dir={active ? sort.dir : null} />
      </button>
    </th>
  );
}

export default function FullRankTable({ rows, grouped, sort, onSort }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // One <tbody> per grade (or one for a flat sort) — on phones each tbody
  // becomes its own card, the grade header sitting above it.
  const groups = useMemo(() => {
    if (!grouped) return [{ tier: null as TierKey | null, rows }];
    return TIERS_ORDER.map((tier) => ({ tier: tier as TierKey | null, rows: rows.filter((r) => r.item.tier === tier) })).filter(
      (g) => g.rows.length > 0
    );
  }, [rows, grouped]);

  const toggle = (code: string) => setExpanded((prev) => (prev === code ? null : code));

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>, code: string) => {
    // Links, the star, flags and the toggle button handle themselves.
    if ((e.target as HTMLElement).closest("a, button")) return;
    toggle(code);
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No companies match your filters"
        message="Try clearing the search or choosing a different sector."
        bn="এই ফিল্টারে কোনো কোম্পানি মিলছে না। সার্চ মুছে বা অন্য সেক্টর বেছে দেখুন।"
      />
    );
  }

  return (
    <div className="rk-table-wrap">
      <table className="rk-table">
        <thead className="rk-thead">
          <tr>
            <th scope="col" className="rk-th rk-num">#</th>
            <HeadCell col="name" label="Company" sort={sort} onSort={onSort} />
            <th scope="col" className="rk-th">Five checks</th>
            <HeadCell col="rank" label="Score" sort={sort} onSort={onSort} />
            <HeadCell col="value" label="Price today" sort={sort} onSort={onSort} />
            <HeadCell col="growth" label="Profit growth" sort={sort} onSort={onSort} className="rk-num rk-hide-lg" />
            <HeadCell col="dividend" label="Dividend" sort={sort} onSort={onSort} className="rk-num rk-hide-lg" />
            <th scope="col" className="rk-th rk-num">Price</th>
            <th scope="col" className="rk-th"><span className="sr-only">Watchlist</span></th>
            <th scope="col" className="rk-th"><span className="sr-only">Quick view</span></th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.tier ?? "all"} className="rk-group">
            {group.tier && (
              <tr className="rk-group-head">
                <td colSpan={COL_COUNT}>
                  <div className="rk-group-head-inner">
                    <span className="rk-dot" style={{ background: TIER_VAR[group.tier] }} aria-hidden />
                    <h2 className="rk-group-title">{TIER_LABELS[group.tier]}</h2>
                    <span className="rk-group-meaning">{TIER_MEANINGS[group.tier]}</span>
                    <span className="rk-group-count nums">
                      <strong>{group.rows.length}</strong> {group.rows.length === 1 ? "company" : "companies"}
                    </span>
                  </div>
                </td>
              </tr>
            )}
            {group.rows.map(({ item, rank }) => (
              <RankRow
                key={item.trading_code}
                item={item}
                rank={rank}
                open={expanded === item.trading_code}
                onToggle={() => toggle(item.trading_code)}
                onRowClick={onRowClick}
              />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function RankRow({
  item,
  rank,
  open,
  onToggle,
  onRowClick,
}: {
  item: RankedItem;
  rank: number;
  open: boolean;
  onToggle: () => void;
  onRowClick: (e: MouseEvent<HTMLTableRowElement>, code: string) => void;
}) {
  const code = item.trading_code;
  const category = item.market_category?.toUpperCase();
  const word = priceWord(item.p4_val);
  const growth = item.eps_yoy_pct;
  const dy = item.div_yield_pct;

  // Narrower screens drop the growth / dividend columns (and phones the
  // price-today one too); one muted line under the name brings them back.
  const subParts: ReactNode[] = [];
  if (growth != null) {
    subParts.push(
      <span key="g" className={`font-semibold ${changeTone(growth)}`}>Profit {changePct(growth, 0)}</span>
    );
  }
  if (dy != null && dy > 0) subParts.push(<span key="d">Pays {dy.toFixed(1)}%</span>);
  const subWord = word && (
    // Its own span (separator included) so CSS can show it only on phones,
    // where the Price today column is gone.
    <span className="rk-sub-word">
      {subParts.length > 0 && " · "}
      <span className={`font-semibold ${word.tone}`}>{word.label}</span>
    </span>
  );

  return (
    <Fragment>
      <tr className={`rk-row${open ? " is-open" : ""}`} onClick={(e) => onRowClick(e, code)}>
        <td className="rk-td rk-td-rank nums">
          <span className={rank <= 3 ? "rk-rank is-top" : "rk-rank"}>{rank}</span>
        </td>

        <td className="rk-td rk-td-company">
          <span className="rk-name-line">
            <Link prefetch={false} href={`/stock/${code}`} className="rk-name">
              {item.company_name ?? code}
            </Link>
            {(category === "Z" || category === "B") && (
              <FlagTag label={`${category} category`} note={FLAG_NOTES[category]} />
            )}
            {item.stale_data && (
              <FlagTag
                label="Old report"
                note={`The latest annual report on file is from ${item.last_reported_year ?? "an earlier year"}${
                  item.data_age_years != null ? ` (${item.data_age_years} years old)` : ""
                }. The score is pulled down until a new one is published.`}
              />
            )}
          </span>
          <span className="rk-meta">
            <b>{code}</b>
            {item.sector && <> · {item.sector}</>}
          </span>
          {(subParts.length > 0 || subWord) && (
            <span className="rk-mobile-sub nums">
              {subParts.map((p, i) => (
                <Fragment key={i}>
                  {i > 0 && " · "}
                  {p}
                </Fragment>
              ))}
              {subWord}
            </span>
          )}
        </td>

        <td className="rk-td rk-td-checks">
          <CheckBars item={item} />
        </td>

        <td className="rk-td rk-td-score">
          <ScoreBadge score={item.score} tier={item.tier} size="sm" />
        </td>

        <td className="rk-td rk-td-value">
          {word ? (
            <span className={`rk-word ${word.tone}`}>
              <span className="rk-word-dot" aria-hidden />
              {word.label}
            </span>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </td>

        <td className={`rk-td rk-num rk-hide-lg nums font-semibold ${changeTone(growth)}`}>
          {growth != null ? changePct(growth, 1) : <span className="text-text-muted">—</span>}
        </td>

        <td className="rk-td rk-num rk-hide-lg nums">
          {dy != null && dy > 0 ? `${dy.toFixed(1)}%` : <span className="text-text-muted">—</span>}
        </td>

        <td className="rk-td rk-num rk-td-price">
          <span className="rk-price nums">{money(item.ltp)}</span>
          {item.change_pct != null && (
            <span className={`rk-chg nums ${changeTone(item.change_pct)}`}>{changePct(item.change_pct, 1)}</span>
          )}
        </td>

        <td className="rk-td rk-td-star">
          <StarButton code={code} />
        </td>

        <td className="rk-td rk-td-toggle">
          <button
            type="button"
            className={`rk-toggle${open ? " is-open" : ""}`}
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} quick view for ${item.company_name ?? code}`}
            onClick={onToggle}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </td>
      </tr>

      {open && (
        <tr className="rk-detail-row">
          <td colSpan={COL_COUNT} className="rk-detail-td">
            <RankRowDetails item={item} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}
