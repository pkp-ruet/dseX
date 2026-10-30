"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { ScoreItem, WatchlistMetaEntry } from "@/lib/api";
import { changePct, changeTone, companyShort, money } from "@/lib/formatters";
import { getTier } from "@/lib/constants";
import { bnDate } from "@/lib/bn";
import type { WatchUpdate } from "@/lib/watch-updates";
import { useLang } from "@/context/LangContext";
import { T } from "@/components/i18n/T";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import { IconArrowRight, IconChevronDown } from "@/components/ui/icons";
import WatchlistAlertCell from "./WatchlistAlertCell";
import { UpdateRow } from "./WatchUpdates";

/*
 * THE watchlist table. Since 2026-10-30 (user: "watchlist page will be same
 * to free and premium, the catch will be the cap") it carries no Premium
 * part: the "Our read" column (fair value, buy-below price, watch-outs) and
 * its lock are gone.
 *
 * Five columns, one calm row per stock:
 *   Company (name; code · grade · Buy / Sell chip) · Price (today under it) ·
 *   Since you followed · What's new (the share's most important update) ·
 *   Details
 *
 * Every row has a labelled Details button (and the whole row taps): it opens
 * a drawer under the row — four facts, where the price sits this year, every
 * update on that share, and the actions. One row open at a time.
 *
 * Below 900px a row is: name + price on top, what's new + the Details button
 * under it. Styles: app/styles/watchlist.css → "The table".
 */

export interface WatchRow {
  item: ScoreItem;
  meta: WatchlistMetaEntry | null;
  /** Yearly high / low. */
  hi: number | null;
  lo: number | null;
  /** Every update on this share, most important first (lib/watch-updates.ts). */
  updates: WatchUpdate[];
}

/** "6 Sep" / "6 সেপ্টেম্বর" (with the year when asked). */
function dayMonth(iso: string | null | undefined, bn: boolean, withYear = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (bn) {
    const s = bnDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    return withYear ? s : s.replace(/\s\d{4}$/, "");
  }
  return d.toLocaleDateString("en-GB", withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
}

function thisYear(iso: string): boolean {
  return new Date(iso).getFullYear() === new Date().getFullYear();
}

/** % move from the close on the day the stock was followed to today. */
export function sinceFollowed(item: ScoreItem, m: WatchlistMetaEntry | null | undefined): number | null {
  if (!m || m.price_at_add == null || m.price_at_add <= 0 || item.ltp == null) return null;
  return ((item.ltp - m.price_at_add) / m.price_at_add) * 100;
}

// ---------------------------------------------------------------------------
// The drawer (an open row)
// ---------------------------------------------------------------------------

function Fact({ k, children, sub }: { k: ReactNode; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="wl-fact">
      <span className="wl-fact-k">{k}</span>
      <span className="wl-fact-v">{children}</span>
      {sub && <span className="wl-fact-x">{sub}</span>}
    </div>
  );
}

function RangeFact({ price, hi, lo, bn }: { price: number | null; hi: number | null; lo: number | null; bn: boolean }) {
  if (price == null || hi == null || lo == null || hi <= lo) return null;
  const pos = Math.max(0, Math.min(1, (price - lo) / (hi - lo)));
  const where =
    pos >= 0.85 ? (bn ? "বছরের সর্বোচ্চের কাছে" : "near the top of its year")
    : pos <= 0.15 ? (bn ? "বছরের সর্বনিম্নের কাছে" : "near the bottom of its year")
    : (bn ? "বছরের মাঝামাঝি" : "in the middle of its year");
  return (
    <div className="wl-range-row">
      <p className="wl-fact-k">
        <T en="Where the price sits this year" bn="এ বছরে দাম কোথায়" />
        <span className="wl-range-where"> · {where}</span>
      </p>
      <span className="wl-range" aria-hidden="true">
        <i style={{ left: `${(pos * 100).toFixed(1)}%` }} />
      </span>
      <span className="wl-range-ends">
        <span>{bn ? "সর্বনিম্ন" : "Low"} {money(lo)}</span>
        <span>{bn ? "সর্বোচ্চ" : "High"} {money(hi)}</span>
      </span>
    </div>
  );
}

function Drawer({ row, bn, onRemove }: { row: WatchRow; bn: boolean; onRemove: (code: string) => void }) {
  const { item, meta, hi, lo, updates } = row;
  const code = item.trading_code;
  const since = sinceFollowed(item, meta);
  const eps = item.eps_yoy_pct;
  const yld = item.div_yield_pct;
  return (
    <div className="wl-drawer">
      <div className="wl-box">
        <div className="wl-facts">
          <Fact
            k={<T en="Since you followed" bn="অনুসরণের পর" />}
            sub={
              meta && meta.price_at_add != null
                ? bn
                  ? `${dayMonth(meta.added_at, bn, true)}, ${money(meta.price_at_add)} থেকে`
                  : `From ${money(meta.price_at_add)} on ${dayMonth(meta.added_at, bn, true)}`
                : undefined
            }
          >
            {since != null ? <span className={changeTone(since)}>{changePct(since, 1)}</span> : <span className="text-text-muted">—</span>}
          </Fact>
          <Fact k={<T en="Profit growth" bn="মুনাফা বৃদ্ধি" />} sub={<T en="Profit a share against last year" bn="গত বছরের তুলনায় শেয়ারপ্রতি মুনাফা" />}>
            {eps != null && !Number.isNaN(eps) ? <span className={changeTone(eps)}>{changePct(eps, 0)}</span> : <span className="text-text-muted">—</span>}
          </Fact>
          <Fact k={<T en="Dividend yield" bn="ডিভিডেন্ড ইল্ড" />} sub={<T en="Cash paid against the price" bn="দামের তুলনায় নগদ ডিভিডেন্ড" />}>
            {yld != null && !Number.isNaN(yld) && yld > 0 ? `${yld.toFixed(1)}%` : <span className="text-text-muted">{bn ? "নেই" : "None"}</span>}
          </Fact>
          <Fact k={<T en="Our score" bn="আমাদের স্কোর" />} sub={<T en="Out of 100" bn="100-এর মধ্যে" />}>
            {item.score != null ? Math.round(item.score) : <span className="text-text-muted">—</span>}
          </Fact>
        </div>
        <RangeFact price={item.ltp} hi={hi} lo={lo} bn={bn} />
      </div>

      <div className="wl-box">
        <p className="wl-box-title">
          <T en="Updates on this share" bn="এই শেয়ারের খবরাখবর" />
        </p>
        {updates.length > 0 ? (
          <ul className="wl-up-list">
            {updates.map((u) => (
              <UpdateRow key={u.id} u={u} showName={false} />
            ))}
          </ul>
        ) : (
          <p className="wl-ups-empty">
            <T
              en="Nothing new lately, and no date ahead yet. It shows here the day something happens."
              bn="সম্প্রতি নতুন কিছু নেই, সামনে কোনো তারিখও নেই। কিছু ঘটলে সেদিনই এখানে দেখাবে।"
            />
          </p>
        )}
      </div>

      <div className="wl-acts">
        <Link href={`/stock/${code}`} prefetch={false} className="wl-page-link">
          <T en="Open the full page" bn="পুরো পেজ খুলুন" />
          <IconArrowRight size={14} />
        </Link>
        <span className="wl-spacer" />
        <WatchlistAlertCell code={code} ltp={item.ltp} w52High={hi} w52Low={lo} />
        <Button
          type="button"
          variant="quiet"
          size="sm"
          onClick={() => onRemove(code)}
          aria-label={bn ? `${code} অনুসরণ বন্ধ করুন` : `Stop following ${code}`}
        >
          <T en="Stop following" bn="অনুসরণ বন্ধ" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One row
// ---------------------------------------------------------------------------

/** The share's most important update in a few words, and how many more. */
function NewCell({ updates, loading }: { updates: WatchUpdate[]; loading: boolean }) {
  const top = updates[0];
  if (!top) {
    return (
      <span className="wl-new wl-new--quiet">
        {loading ? <T en="Checking…" bn="দেখা হচ্ছে…" /> : <T en="Nothing new" bn="নতুন কিছু নেই" />}
      </span>
    );
  }
  const more = updates.length - 1;
  return (
    <span className="wl-new">
      <span className="wl-new-head">
        <i className={`wl-up-dot wl-up-dot--${top.tone}`} aria-hidden="true" />
        <T en={top.short.en} bn={top.short.bn} />
      </span>
      {more > 0 && (
        <span className="wl-new-more">
          <T en={`+${more} more`} bn={`আরও ${more}টি`} />
        </span>
      )}
    </span>
  );
}

function Row({
  row,
  loading,
  isOpen,
  onToggle,
  onRemove,
}: {
  row: WatchRow;
  loading: boolean;
  isOpen: boolean;
  onToggle: (code: string, el: HTMLElement | null) => void;
  onRemove: (code: string) => void;
}) {
  const { lang } = useLang();
  const bn = lang === "bn";
  const { item, meta } = row;
  const code = item.trading_code;
  const name = companyShort(item.company_name) || code;
  const since = sinceFollowed(item, meta);
  const moreId = `wl-more-${code}`;
  const sig = item.signal;

  return (
    <tbody className="wl-row" data-open={isOpen ? "" : undefined}>
      <tr
        className="wl-head"
        onClick={(e) => {
          // The name link and the buttons keep their own job.
          if ((e.target as HTMLElement).closest("a, button")) return;
          onToggle(code, e.currentTarget.closest("tbody"));
        }}
      >
        <td data-cell="who">
          <Link prefetch={false} href={`/stock/${code}`} className="wl-who" title={item.company_name ?? undefined}>
            {name}
          </Link>
          <span className="wl-meta">
            <span className="wl-code">{code}</span>
            <TierPill tier={getTier(item.score)} />
            {(sig?.signal === "buy" || sig?.signal === "sell") && <SignalChip signal={sig.signal} strength={sig.strength} />}
          </span>
        </td>
        <td data-cell="price" className="wl-num">
          <span className="wl-price">{item.ltp != null ? money(item.ltp) : "—"}</span>
          <span className={`wl-chg ${changeTone(item.change_pct)}`}>
            {item.change_pct != null ? changePct(item.change_pct) : "—"}
            <span className="wl-chg-l">
              {" "}
              <T en="today" bn="আজ" />
            </span>
          </span>
        </td>
        <td data-cell="since" className="wl-num">
          {since != null && meta ? (
            <>
              <span className={`wl-since ${changeTone(since)}`}>{changePct(since, 1)}</span>
              <span className="wl-since-l">
                <T
                  en={`since ${dayMonth(meta.added_at, false, !thisYear(meta.added_at))}`}
                  bn={`${dayMonth(meta.added_at, true, !thisYear(meta.added_at))} থেকে`}
                />
              </span>
            </>
          ) : (
            <span className="wl-dash">—</span>
          )}
        </td>
        <td data-cell="new">
          <NewCell updates={row.updates} loading={loading} />
        </td>
        <td data-cell="more">
          <button
            type="button"
            className="wl-more-btn"
            aria-expanded={isOpen}
            aria-controls={moreId}
            onClick={(e) => onToggle(code, e.currentTarget.closest("tbody"))}
          >
            <span>{isOpen ? <T en="Close" bn="বন্ধ" /> : <T en="Details" bn="বিস্তারিত" />}</span>
            <IconChevronDown size={16} />
            <span className="sr-only">{name}</span>
          </button>
        </td>
      </tr>
      <tr className="wl-more" id={moreId}>
        <td colSpan={5}>{isOpen && <Drawer row={row} bn={bn} onRemove={onRemove} />}</td>
      </tr>
    </tbody>
  );
}

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

export default function WatchTable({
  rows,
  loading,
  onRemove,
  footer,
}: {
  rows: WatchRow[];
  /** The updates request is still out (no cached copy). */
  loading: boolean;
  onRemove: (code: string) => void;
  /** Under the rows (the "codes not in today's scores" note). */
  footer?: ReactNode;
}) {
  const [openCode, setOpenCode] = useState<string | null>(null);

  // One row open at a time. When a row above closes, the tapped row is held
  // where it was on screen.
  function toggle(code: string, el: HTMLElement | null) {
    const before = el?.getBoundingClientRect().top ?? 0;
    setOpenCode((cur) => (cur === code ? null : code));
    requestAnimationFrame(() => {
      if (!el) return;
      const shift = el.getBoundingClientRect().top - before;
      if (Math.abs(shift) > 1) window.scrollBy({ top: shift, behavior: "instant" });
    });
  }

  return (
    <Card padding="none" className="wl-list">
      <table className="wl-table">
        <colgroup>
          <col className="wl-col-who" />
          <col className="wl-col-price" />
          <col className="wl-col-since" />
          <col className="wl-col-new" />
          <col className="wl-col-more" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col"><T en="Company" bn="কোম্পানি" /></th>
            <th scope="col" className="wl-num"><T en="Price" bn="দাম" /></th>
            <th scope="col" className="wl-num"><T en="Since you followed" bn="অনুসরণের পর" /></th>
            <th scope="col"><T en="What's new" bn="নতুন কী" /></th>
            <th scope="col">
              <span className="sr-only"><T en="Details" bn="বিস্তারিত" /></span>
            </th>
          </tr>
        </thead>
        {rows.map((r) => (
          <Row
            key={r.item.trading_code}
            row={r}
            loading={loading}
            isOpen={openCode === r.item.trading_code}
            onToggle={toggle}
            onRemove={onRemove}
          />
        ))}
      </table>
      {footer}
    </Card>
  );
}
