"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { GlanceRow, ScoreItem, WatchlistMetaEntry } from "@/lib/api";
import { changePct, changeTone, companyShort, money, taka } from "@/lib/formatters";
import { getTier } from "@/lib/constants";
import { bnDate } from "@/lib/bn";
import { PREMIUM_PATH } from "@/lib/premium";
import { useLang } from "@/context/LangContext";
import { T } from "@/components/i18n/T";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import Skeleton from "@/components/ui/Skeleton";
import { IconArrowRight, IconChevronDown, IconCrown, IconLock } from "@/components/ui/icons";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import LockPanel, { type LockTile } from "@/components/premium/LockPanel";
import WatchlistAlertCell from "./WatchlistAlertCell";

/*
 * THE watchlist table (2026-10-28, user decisions: "one table — free readers
 * see the price and the basics, Premium adds the analysis"; then "messy, hard
 * to read — make it clean, and on a phone it must be clear a row opens").
 *
 * Five columns, one calm row per stock:
 *   Company (name; code · grade · Buy chip) · Price (today under it) ·
 *   Since you followed · Our read (Premium) · Details
 * "Our read" is ONE summary: a dot + the signal's answer and short reason
 * ("Not yet · a Buy under ৳240"), then one muted line of what else matters
 * (fair-value gap · a record date or AGM within 30 days · watch-outs). A free
 * reader sees a lock and two calm bars there — the answer stays in the HTML
 * under `.premium-locked` (screen-only, like every lock) — and one panel
 * under the rows with the free counts.
 *
 * Every row has a labelled Details button (and the whole row taps): it opens
 * a drawer under the row — the facts (free), our read in full (Premium) and
 * the actions. One row open at a time.
 *
 * Below 900px a row is: name + price on top, our read + the Details button
 * under it. Styles: app/styles/watchlist.css → "The table".
 */

export interface WatchRow {
  item: ScoreItem;
  /** null while the glance is loading, or when the backend has no row for it. */
  glance: GlanceRow | null;
  meta: WatchlistMetaEntry | null;
  /** Yearly high / low (glance first, the near-extremes list as a fallback). */
  hi: number | null;
  lo: number | null;
}

const SOON_DAYS = 30;

// The signal's reason in two to four words, written to follow a "·".
// The full sentence (reason_en / reason_bn) is in the drawer.
const REASON_SHORT: Record<string, [string, string]> = {
  quality_cheap: ["good company, low price", "ভালো কোম্পানি, কম দাম"],
  excellent_fair_price: ["excellent company, fair price", "চমৎকার কোম্পানি, ন্যায্য দাম"],
  weak_fundamentals: ["weak company", "দুর্বল কোম্পানি"],
  not_rated: ["not rated yet", "এখনো রেটিং নেই"],
  average_fundamentals: ["average company", "মাঝারি মানের কোম্পানি"],
  z_category: ["Z category share", "Z ক্যাটাগরির শেয়ার"],
  stale_financials: ["old accounts", "পুরোনো হিসাব"],
  thin_trading: ["too little trading", "লেনদেন খুব কম"],
  earnings_dropped: ["profit fell sharply", "মুনাফা অনেক কমেছে"],
  heavy_debt: ["loans too big", "ঋণ অনেক বেশি"],
  near_52w_high: ["near its yearly high", "বছরের সর্বোচ্চ দামের কাছে"],
  quality_expensive: ["price too high", "দাম এখন বেশি"],
  good_wait_price: ["waiting for a lower price", "আরও কম দামের অপেক্ষা"],
};

function reasonShort(key: string | null | undefined, bn: boolean): string {
  const pair = REASON_SHORT[key ?? ""];
  if (!pair) return "";
  return bn ? pair[1] : pair[0];
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
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

function inDays(n: number | null | undefined, bn: boolean): string {
  if (n == null) return "";
  if (n <= 0) return bn ? "আজ" : "today";
  if (n === 1) return bn ? "আগামীকাল" : "tomorrow";
  return bn ? `${n} দিন পর` : `in ${n} days`;
}

/** % move from the close on the day the stock was followed to today. */
export function sinceFollowed(item: ScoreItem, m: WatchlistMetaEntry | null | undefined): number | null {
  if (!m || m.price_at_add == null || m.price_at_add <= 0 || item.ltp == null) return null;
  return ((item.ltp - m.price_at_add) / m.price_at_add) * 100;
}

// ---------------------------------------------------------------------------
// The lock for one answer: a calm placeholder for a free reader, the answer
// in the HTML underneath (screen-only).
// ---------------------------------------------------------------------------

function Bars({ n = 2 }: { n?: 1 | 2 }) {
  return (
    <span className="wl-bars" aria-hidden="true">
      <i />
      {n === 2 && <i />}
    </span>
  );
}

function Locked({ open, mask, children }: { open: boolean; mask?: ReactNode; children: ReactNode }) {
  if (open) return <>{children}</>;
  return (
    <div className="premium-locked" data-locked="true" data-preview="mask">
      <div className="premium-locked-body" aria-hidden="true" {...{ inert: true }}>
        {children}
      </div>
      {mask ?? <Bars />}
      <span className="sr-only">
        <T en="In Premium" bn="প্রিমিয়ামে" />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Our read, as one summary (the row)
// ---------------------------------------------------------------------------

type Tone = "buy" | "sell" | "wait";

/** The signal's answer + its short reason, for the summary's first line. */
function verdict(g: GlanceRow, bn: boolean): { tone: Tone; text: string } {
  const s = g.signal;
  const why = reasonShort(s.reason_key, bn);
  const join = (a: string, b: string) => (b ? `${a} · ${b}` : a);
  if (s.signal === "buy") {
    const word = s.strength === "strong"
      ? bn ? "জোরালো কেনার সংকেত" : "A strong Buy"
      : bn ? "কেনার সংকেত" : "A Buy";
    return { tone: "buy", text: join(word, why) };
  }
  if (s.signal === "sell") return { tone: "sell", text: join(bn ? "বিক্রির সংকেত" : "A Sell", why) };
  if (s.buy_below != null) {
    return {
      tone: "wait",
      text: bn ? `এখন না · ${money(s.buy_below)}-এর নিচে কেনা যায়` : `Not yet · a Buy under ${money(s.buy_below)}`,
    };
  }
  return { tone: "wait", text: join(bn ? "আজ কেনার সংকেত নেই" : "Not a Buy today", why) };
}

/** The fair-value gap in words, or null when there is no clear estimate. */
function fairWords(g: GlanceRow, bn: boolean): string | null {
  const f = g.fair;
  if (!f || f.low == null || f.high == null) return null;
  if (f.gap_pct == null) {
    if (f.stance === "cheap") return bn ? "ন্যায্য দামের চেয়ে সস্তা" : "Cheap for its fair value";
    if (f.stance === "expensive") return bn ? "ন্যায্য দামের চেয়ে দামি" : "Dear for its fair value";
    return bn ? "ন্যায্য দামের কাছে" : "Near fair value";
  }
  if (Math.abs(f.gap_pct) < 1) return bn ? "ন্যায্য দামে" : "At fair value";
  const n = Math.abs(f.gap_pct).toFixed(0);
  return f.gap_pct < 0
    ? bn ? `ন্যায্য দামের চেয়ে ${n}% কম` : `${n}% under fair value`
    : bn ? `ন্যায্য দামের চেয়ে ${n}% বেশি` : `${n}% over fair value`;
}

/** What else matters, in one muted line: up to three short facts. */
function readFacts(g: GlanceRow, bn: boolean): string[] {
  const out: string[] = [];
  const f = fairWords(g, bn);
  if (f) out.push(f);
  const e = g.event;
  if (e && e.days_left != null && e.days_left <= SOON_DAYS) {
    out.push(
      e.kind === "agm"
        ? bn ? `এজিএম ${inDays(e.days_left, bn)}` : `AGM ${inDays(e.days_left, bn)}`
        : bn ? `রেকর্ড ডেট ${inDays(e.days_left, bn)}` : `Record date ${inDays(e.days_left, bn)}`,
    );
  }
  const n = g.risks.length;
  if (n > 0) out.push(bn ? `${n}টি সতর্কতা` : `${n} ${n === 1 ? "watch-out" : "watch-outs"}`);
  return out;
}

function ReadSummary({ g, bn }: { g: GlanceRow; bn: boolean }) {
  const v = verdict(g, bn);
  const facts = readFacts(g, bn);
  return (
    <span className="wl-sum">
      <span className="wl-sum-head">
        <i className={`wl-sum-dot wl-sum-dot--${v.tone}`} aria-hidden="true" />
        <span>{v.text}</span>
      </span>
      {facts.length > 0 && <span className="wl-sum-facts">{facts.join(" · ")}</span>}
    </span>
  );
}

/** A free reader's summary cell: a lock, then (phones) what it is, (wide) two bars. */
function LockedSummary() {
  return (
    <span className="wl-sum-locked">
      <IconLock size={14} />
      <span className="wl-sum-locked-l">
        <T en="Our read" bn="আমাদের বিশ্লেষণ" />
      </span>
      <span className="wl-prem-tag">
        <T en="Premium" bn="প্রিমিয়াম" />
      </span>
      <Bars />
    </span>
  );
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

function ReadItem({ q, children }: { q: ReactNode; children: ReactNode }) {
  return (
    <div className="wl-read-item">
      <dt>{q}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function BuyFull({ g, bn }: { g: GlanceRow; bn: boolean }) {
  const s = g.signal;
  const v = verdict(g, bn);
  const reason = (bn ? s.reason_bn : s.reason_en) || s.reason_en;
  return (
    <>
      <span className="wl-read-lead">
        <i className={`wl-sum-dot wl-sum-dot--${v.tone}`} aria-hidden="true" />
        {s.signal === "buy" ? (bn ? "হ্যাঁ" : "Yes") : s.signal === "sell" ? (bn ? "না, বিক্রির সংকেত" : "No, it is a Sell") : (bn ? "এখন না" : "Not yet")}
      </span>
      {reason && <span className="wl-read-text">{reason}</span>}
      {s.buy_below != null && (
        <span className="wl-read-text">
          {bn ? `দাম ${money(s.buy_below)}-এর নিচে নামলে এটি কেনার সংকেত হবে।` : `It turns into a Buy below ${money(s.buy_below)}.`}
        </span>
      )}
    </>
  );
}

function FairFull({ g, bn }: { g: GlanceRow; bn: boolean }) {
  const f = g.fair;
  if (!f || f.low == null || f.high == null) {
    return <span className="wl-read-text">{bn ? "ন্যায্য দাম হিসাব করার মতো যথেষ্ট তথ্য নেই।" : "There are not enough figures to estimate a fair value."}</span>;
  }
  const range = `${money(f.low)}–${money(f.high)}`;
  const words = fairWords(g, bn);
  if (f.estimates_disagree || f.gap_pct == null) {
    return (
      <>
        {words && <span className="wl-read-lead">{words}</span>}
        <span className="wl-read-text">
          {bn
            ? `আমাদের হিসাবগুলো ${range}-এর মধ্যে, তবে একমত নয়, তাই একটি দাম বলছি না।`
            : `Our estimates fall between ${range} but do not agree, so we don't give one price.`}
        </span>
      </>
    );
  }
  return (
    <>
      {words && <span className="wl-read-lead">{words}</span>}
      <span className="wl-read-text">
        {bn ? `আজকের দাম ${money(g.price)}, আমাদের অনুমান ${range}।` : `Today's price is ${money(g.price)}; our estimate is ${range}.`}
      </span>
    </>
  );
}

function EventFull({ g, bn }: { g: GlanceRow; bn: boolean }) {
  const e = g.event;
  if (!e) {
    return <span className="wl-read-text">{bn ? "আগামী 4 মাসে কোনো রেকর্ড ডেট বা এজিএম নেই।" : "No record date or AGM in the next 4 months."}</span>;
  }
  const more = e.more > 0 ? (bn ? `এরপর আরও ${e.more}টি।` : `${e.more} more after that.`) : "";
  if (e.kind === "agm") {
    return (
      <>
        <span className="wl-read-lead">{bn ? `এজিএম ${inDays(e.days_left, bn)}` : `AGM ${inDays(e.days_left, bn)}`}</span>
        <span className="wl-read-text">{[dayMonth(e.date, bn, true), more].filter(Boolean).join(bn ? "। " : ". ")}</span>
      </>
    );
  }
  const what = [
    e.cash_per_share ? (bn ? `শেয়ারপ্রতি ${taka(e.cash_per_share)} নগদ` : `${taka(e.cash_per_share)} a share in cash`) : "",
    e.stock_pct ? (bn ? `${e.stock_pct}% বোনাস শেয়ার` : `${e.stock_pct}% bonus shares`) : "",
  ].filter(Boolean).join(bn ? " ও " : " and ");
  const yld = e.yield_pct ? (bn ? ` (ইল্ড ${e.yield_pct.toFixed(1)}%)` : ` (${e.yield_pct.toFixed(1)}% yield)`) : "";
  const buy =
    e.buy_days_left != null && e.buy_days_left < 0
      ? bn ? "এবার কেনার সময় শেষ।" : "It is too late to buy for this one."
      : e.buy_by
        ? bn ? `পেতে হলে কিনুন ${dayMonth(e.buy_by, bn)}-এর মধ্যে।` : `To get it, buy by ${dayMonth(e.buy_by, bn)}.`
        : "";
  return (
    <>
      <span className="wl-read-lead">{bn ? `রেকর্ড ডেট ${inDays(e.days_left, bn)}` : `Record date ${inDays(e.days_left, bn)}`}</span>
      <span className="wl-read-text">
        {[
          dayMonth(e.date, bn, true) + (bn ? "।" : "."),
          what ? `${bn ? what : cap(what)}${yld}${bn ? "।" : "."}` : "",
          buy,
          more,
        ].filter(Boolean).join(" ")}
      </span>
    </>
  );
}

function RisksFull({ g, bn }: { g: GlanceRow; bn: boolean }) {
  if (g.risks.length === 0) {
    return <span className="wl-read-text">{bn ? "আমাদের চোখে কোনো সতর্কতা পড়েনি।" : "We found nothing to warn you about."}</span>;
  }
  return (
    <ul className="wl-risks">
      {g.risks.map((r) => (
        <li key={r.key}>{bn ? r.bn : r.en}</li>
      ))}
    </ul>
  );
}

function Drawer({ row, open, bn, onRemove }: { row: WatchRow; open: boolean; bn: boolean; onRemove: (code: string) => void }) {
  const { item, glance: g, meta, hi, lo } = row;
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
          <Fact k={<T en="Profit growth" bn="মুনাফা বৃদ্ধি" />} sub={<T en="EPS against last year" bn="গত বছরের তুলনায় ইপিএস" />}>
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

      <div className="wl-box wl-read">
        <p className="wl-read-top">
          <span className="wl-read-tag">
            {open ? <IconCrown size={16} /> : <IconLock size={16} />}
            <T en="Our read" bn="আমাদের বিশ্লেষণ" />
          </span>
          {!open && (
            <span className="wl-prem-tag">
              <T en="Premium" bn="প্রিমিয়াম" />
            </span>
          )}
        </p>
        {g ? (
          <dl className="wl-read-list">
            <ReadItem q={<T en="Buy today?" bn="আজ কেনা যায়?" />}>
              <Locked open={open}><BuyFull g={g} bn={bn} /></Locked>
            </ReadItem>
            <ReadItem q={<T en="Fair value" bn="ন্যায্য দাম" />}>
              <Locked open={open}><FairFull g={g} bn={bn} /></Locked>
            </ReadItem>
            <ReadItem q={<T en="Next event" bn="পরের ঘটনা" />}>
              <Locked open={open}><EventFull g={g} bn={bn} /></Locked>
            </ReadItem>
            <ReadItem q={<T en="Watch-outs" bn="সতর্কতা" />}>
              <Locked open={open}><RisksFull g={g} bn={bn} /></Locked>
            </ReadItem>
          </dl>
        ) : (
          <p className="wl-read-none">
            <T en="Our read for this share isn't ready yet." bn="এই শেয়ারের বিশ্লেষণ এখনো তৈরি হয়নি।" />
          </p>
        )}
        {!open && g && (
          <div className="wl-read-foot">
            <p>
              <T
                en="Premium answers these four questions for every share you follow."
                bn="প্রিমিয়াম আপনার প্রতিটি শেয়ারের জন্য এই চারটি প্রশ্নের উত্তর দেয়।"
              />
            </p>
            <Link href={PREMIUM_PATH} prefetch={false} className="btn-primary btn-sm">
              <T en="See it with Premium" bn="প্রিমিয়ামে দেখুন" />
            </Link>
          </div>
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

function Row({
  row,
  open,
  glanceLoading,
  isOpen,
  onToggle,
  onRemove,
}: {
  row: WatchRow;
  open: boolean;
  glanceLoading: boolean;
  isOpen: boolean;
  onToggle: (code: string, el: HTMLElement | null) => void;
  onRemove: (code: string) => void;
}) {
  const { lang } = useLang();
  const bn = lang === "bn";
  const { item, glance: g, meta } = row;
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
            {/* The free Buy chip. A Premium reader gets the signal with its
                reason in "Our read", so it isn't repeated here. */}
            {!open && sig?.signal === "buy" && <SignalChip signal="buy" strength={sig.strength} />}
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
        <td data-cell="read">
          {g ? (
            <Locked open={open} mask={<LockedSummary />}>
              <ReadSummary g={g} bn={bn} />
            </Locked>
          ) : glanceLoading ? (
            <Skeleton width="80%" height={12} />
          ) : null}
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
        <td colSpan={5}>{isOpen && <Drawer row={row} open={open} bn={bn} onRemove={onRemove} />}</td>
      </tr>
    </tbody>
  );
}

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

export default function WatchTable({
  rows,
  glanceLoading,
  onRemove,
  footer,
}: {
  rows: WatchRow[];
  /** The glance request is still out (no cached copy). */
  glanceLoading: boolean;
  onRemove: (code: string) => void;
  /** Under the rows (the "codes not in today's scores" note). */
  footer?: ReactNode;
}) {
  const open = usePremiumOpen();
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

  // The free counts behind the lock: the reader's stakes, never which stock.
  const read = rows.map((r) => r.glance).filter((g): g is GlanceRow => g != null);
  const under = read.filter((g) => g.fair?.gap_pct != null && g.fair.gap_pct <= -1).length;
  const events = read.filter((g) => g.event?.days_left != null && g.event.days_left <= SOON_DAYS).length;
  const risky = read.filter((g) => g.risks.length > 0).length;
  const zones = read.filter((g) => g.signal.buy_below != null).length;
  const tiles: LockTile[] = [
    { value: String(under), label: { en: "trade under fair value", bn: "ন্যায্য দামের নিচে" } },
    { value: String(events), label: { en: `have a record date or AGM in ${SOON_DAYS} days`, bn: `${SOON_DAYS} দিনে রেকর্ড ডেট বা এজিএম` } },
    { value: String(risky), label: { en: risky === 1 ? "carries a watch-out" : "carry a watch-out", bn: "সতর্কতা আছে" } },
    { value: String(zones), label: { en: "have a price that would make them a Buy", bn: "কোন দামে কেনা যায়, জানা আছে" } },
  ].filter((t) => t.value !== "0");
  const n = rows.length;

  return (
    <Card padding="none" className="wl-list">
      <table className="wl-table">
        <colgroup>
          <col className="wl-col-who" />
          <col className="wl-col-price" />
          <col className="wl-col-since" />
          <col className="wl-col-read" />
          <col className="wl-col-more" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col"><T en="Company" bn="কোম্পানি" /></th>
            <th scope="col" className="wl-num"><T en="Price" bn="দাম" /></th>
            <th scope="col" className="wl-num"><T en="Since you followed" bn="অনুসরণের পর" /></th>
            <th scope="col">
              <span className="wl-read-tag">
                {open ? <IconCrown size={14} /> : <IconLock size={14} />}
                <T en="Our read" bn="আমাদের বিশ্লেষণ" />
              </span>
              {!open && (
                <span className="wl-prem-tag">
                  <T en="Premium" bn="প্রিমিয়াম" />
                </span>
              )}
            </th>
            <th scope="col">
              <span className="sr-only"><T en="Details" bn="বিস্তারিত" /></span>
            </th>
          </tr>
        </thead>
        {rows.map((r) => (
          <Row
            key={r.item.trading_code}
            row={r}
            open={open}
            glanceLoading={glanceLoading}
            isOpen={openCode === r.item.trading_code}
            onToggle={toggle}
            onRemove={onRemove}
          />
        ))}
      </table>

      {!open && read.length > 0 && (
        <LockPanel job="understand"
          variant="full"
          inset
          gutter
          title={{
            en: n === 1 ? "See our read on your share" : `See our read on your ${n} shares`,
            bn: n === 1 ? "আপনার শেয়ারের ওপর আমাদের বিশ্লেষণ দেখুন" : `আপনার ${n}টি শেয়ারের ওপর আমাদের বিশ্লেষণ দেখুন`,
          }}
          sub={{
            en: "For each share: whether it is a Buy today and at what price, its price against our fair-value estimate, the next record date with the last day to buy, and every watch-out.",
            bn: "প্রতিটি শেয়ারের জন্য: আজ কেনা যায় কি না আর কোন দামে, আমাদের ন্যায্য দামের তুলনায় আজকের দাম, পরের রেকর্ড ডেট ও কেনার শেষ দিন, আর সব সতর্কতা।",
          }}
          tiles={tiles}
          mine={0}
          count={n}
          lock="Watchlist: our read"
          what={{ en: "Our read on your watchlist", bn: "আপনার ওয়াচলিস্টের বিশ্লেষণ" }}
          cta={{ en: "See it with Premium", bn: "প্রিমিয়ামে দেখুন" }}
        />
      )}
      {footer}
    </Card>
  );
}
