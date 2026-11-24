"use client";

import { useState } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import TierPill from "@/components/ui/TierPill";
import { IconChevronDown } from "@/components/ui/icons";
import MaskedName from "@/components/premium/MaskedName";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import { openWatchRules } from "@/components/watch-rules/store";
import { T } from "@/components/i18n/T";
import type { ScreenerFilterDef } from "@/lib/api";
import { TIER_LABELS, type TierKey } from "@/lib/constants";
import { changePct, changeTone, money } from "@/lib/formatters";
import { cell, keyHead, type Bi, type Figure, type ScreenerRow } from "@/lib/screener";

/** Rows per "Show more". */
export const PAGE = 30;

const tierOf = (v: unknown): TierKey | null =>
  typeof v === "string" && v in TIER_LABELS ? (v as TierKey) : null;

/**
 * A list's shares in the screener's pop-up (2026-11-24, user: "design a new
 * table with relevant key information which look clean and easy to read").
 * Columns: **#** · **Company** (name + "New" + the reader's H / ★, then code ·
 * sector · our group, then why it is on the list) · **Price today** (under
 * the key figure on phones) · **the key figure** big, its plain name once in
 * the header. `limit` rows, then "Show more".
 *
 * Three modes (2026-11-24, user: "Build 1, 2 and 3"):
 * - `masked` — a reader without Premium sees the rows as they are, every
 *   figure and the reason, but the company as a grey bar: no name, code,
 *   sector, price or link (the row-lock pattern; never a share's name);
 * - `peek` — a Premium reader taps a row to open its quick look in place
 *   (our six analysis words, the fair price range, the one serious warning,
 *   then Read our analysis · Compare · Alert me); one open at a time;
 * - neither — every share by sector and price for a free reader: each row a
 *   link to its stock page.
 * `onOpen(code)` runs before a tap leaves the page, so the pop-up can come
 * back to the same row.
 */
export default function ScreenerList({
  rows,
  keyFig,
  defs,
  limit,
  onMore,
  reasonOf,
  newCodes,
  onOpen,
  masked = false,
  peek = false,
}: {
  rows: ScreenerRow[];
  keyFig: string;
  defs: Map<string, ScreenerFilterDef>;
  limit: number;
  onMore?: () => void;
  reasonOf?: (r: ScreenerRow) => Bi | null;
  newCodes?: Set<string>;
  onOpen?: (code: string) => void;
  masked?: boolean;
  peek?: boolean;
}) {
  const [openCode, setOpenCode] = useState<string | null>(null);
  const shown = rows.slice(0, limit);
  const left = rows.length - shown.length;
  const def = defs.get(keyFig);
  const head = keyHead(keyFig, def);

  return (
    <div className={`scl${masked ? " scl--masked" : ""}`}>
      <div className="scl-head" aria-hidden="true">
        <span className="scl-h-rank">#</span>
        <span className="scl-h-main"><T en="Company" bn="কোম্পানি" /></span>
        <span className="scl-h-px">{masked ? null : <T en="Price today" bn="আজকের দাম" />}</span>
        <span className="scl-h-fig"><T en={head.en} bn={head.bn} /></span>
      </div>
      <ol className="scl-list">
        {shown.map((r, i) => {
          const tier = tierOf(r.v.grade);
          const why = reasonOf?.(r) ?? null;
          const isNew = newCodes?.has(r.code) ?? false;
          const v = r.v[keyFig];
          const num = typeof v === "number" ? v : null;
          const value = def ? cell(v ?? null, def) : "—";
          const valueBn = def ? cell(v ?? null, def, true) : "—";
          const tone = def?.signed ? changeTone(num) : "";
          const price = typeof r.v.price === "number" ? r.v.price : null;
          const change = typeof r.v.change === "number" ? r.v.change : null;
          const isOpen = peek && openCode === r.code;

          const inner = (
            <>
              <span className="scl-rank nums">{i + 1}</span>
              <span className="scl-main">
                <span className="scl-name">
                  {masked ? <MaskedName name={r.name} /> : <span className="scl-name-t">{r.name}</span>}
                  {!masked && <PersonalMark code={r.code} />}
                  {isNew && <span className="scr-new"><T en="New" bn="নতুন" /></span>}
                </span>
                <span className="scl-meta">
                  {!masked && <span className="scl-code">{r.code}</span>}
                  {!masked && r.v.sector ? <span className="scl-sector">{String(r.v.sector)}</span> : null}
                  {tier && <TierPill tier={tier} />}
                </span>
                {why && <span className="scl-why"><T en={why.en} bn={why.bn} /></span>}
              </span>
              {!masked && (
                <span className="scl-px nums">
                  <span className="scl-px-v">{money(price)}</span>
                  {change != null && <span className={`scl-px-c ${changeTone(change)}`}>{changePct(change)}</span>}
                </span>
              )}
              <span className="scl-fig">
                <span className={`scl-fig-v nums ${tone}`}>
                  {value === valueBn ? value : <T en={value} bn={valueBn} />}
                </span>
                {peek && (
                  <span className={`scl-chev${isOpen ? " is-open" : ""}`} aria-hidden="true">
                    <IconChevronDown size={16} />
                  </span>
                )}
              </span>
            </>
          );

          return (
            <li key={r.code} id={`scl-${r.code}`} className={`scl-row${isOpen ? " is-open" : ""}`}>
              {masked ? (
                <div className="scl-link">{inner}</div>
              ) : peek ? (
                <button
                  type="button"
                  className="scl-link"
                  aria-expanded={isOpen}
                  aria-controls={`scl-q-${r.code}`}
                  onClick={() => setOpenCode(isOpen ? null : r.code)}
                >
                  {inner}
                </button>
              ) : (
                <Link href={`/stock/${encodeURIComponent(r.code)}`} className="scl-link" onClick={() => onOpen?.(r.code)}>
                  {inner}
                </Link>
              )}
              {isOpen && <QuickLook row={r} onOpen={onOpen} />}
            </li>
          );
        })}
      </ol>
      {left > 0 && onMore && (
        <div className="scl-more">
          <Button variant="quiet" onClick={onMore}>
            <T en={`Show ${Math.min(left, PAGE)} more of ${left}`} bn={`আরও ${Math.min(left, PAGE)}টি দেখুন (বাকি ${left}টি)`} />
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The quick look: our analysis in six words, without leaving the list.
// ---------------------------------------------------------------------------

type Tone = "good" | "mid" | "bad" | "none";
const CHECK_WORD: Record<string, { w: Bi; tone: Tone }> = {
  strong: { w: { en: "Strong", bn: "শক্তিশালী" }, tone: "good" },
  fair: { w: { en: "Fair", bn: "মোটামুটি" }, tone: "mid" },
  weak: { w: { en: "Weak", bn: "দুর্বল" }, tone: "bad" },
};
const PRICE_WORD: Record<string, { w: Bi; tone: Tone }> = {
  low: { w: { en: "Low", bn: "কম" }, tone: "good" },
  fair: { w: { en: "Fair", bn: "ন্যায্য" }, tone: "mid" },
  high: { w: { en: "High", bn: "বেশি" }, tone: "bad" },
};
const NOT_MEASURED = { w: { en: "Not measured", bn: "মাপা হয় না" }, tone: "none" as Tone };

const num = (x: Figure) => (typeof x === "number" && Number.isFinite(x) ? x : null);

function safetyWord(v: Record<string, Figure>): { w: Bi; tone: Tone } {
  if (v.warnings == null) return { w: { en: "Not checked", bn: "যাচাই হয়নি" }, tone: "none" };
  if (v.warnings === "some") return { w: { en: "A serious problem", bn: "গুরুতর সমস্যা" }, tone: "bad" };
  const a = num(v.amber) ?? 0;
  if (a > 0) return { w: { en: `${a} smaller ${a === 1 ? "thing" : "things"}`, bn: `${a}টি ছোট বিষয়` }, tone: "mid" };
  return { w: { en: "Nothing serious", bn: "গুরুতর কিছু নেই" }, tone: "good" };
}

function QuickLook({ row, onOpen }: { row: ScreenerRow; onOpen?: (code: string) => void }) {
  const v = row.v;
  const cw = (k: string) => CHECK_WORD[String(v[k] ?? "")] ?? NOT_MEASURED;
  const items: { label: Bi; word: { w: Bi; tone: Tone } }[] = [
    { label: { en: "Profit", bn: "মুনাফা" }, word: cw("w_profit") },
    { label: { en: "Finances", bn: "আর্থিক অবস্থা" }, word: cw("w_fin") },
    { label: { en: "Business", bn: "ব্যবসা" }, word: cw("w_biz") },
    { label: { en: "Dividend", bn: "ডিভিডেন্ড" }, word: cw("w_div") },
    { label: { en: "Price", bn: "দাম" }, word: PRICE_WORD[String(v.price_word ?? "")] ?? NOT_MEASURED },
    { label: { en: "Safety", bn: "নিরাপত্তা" }, word: safetyWord(v) },
  ];
  const lo = num(v.fair_lo), hi = num(v.fair_hi), price = num(v.price);
  const warnEn = typeof v.warn_en === "string" ? v.warn_en : null;
  const warnBn = typeof v.warn_bn === "string" ? v.warn_bn : warnEn;
  const code = encodeURIComponent(row.code);

  return (
    <div id={`scl-q-${row.code}`} className="scq">
      <p className="scq-title"><T en="Our analysis in short" bn="সংক্ষেপে আমাদের বিশ্লেষণ" /></p>
      <dl className="scq-grid">
        {items.map((it) => (
          <div key={it.label.en} className="scq-item">
            <dt><T en={it.label.en} bn={it.label.bn} /></dt>
            <dd className={`scq-w scq-w--${it.word.tone}`}><T en={it.word.w.en} bn={it.word.w.bn} /></dd>
          </div>
        ))}
      </dl>
      {lo != null && hi != null && (
        <p className="scq-line nums">
          <T
            en={`Our fair price: ${money(lo)} to ${money(hi)}${price != null ? `. Today ${money(price)}.` : "."}`}
            bn={`আমাদের ন্যায্য দাম: ${money(lo)} থেকে ${money(hi)}${price != null ? `। আজ ${money(price)}।` : "।"}`}
          />
        </p>
      )}
      {warnEn && (
        <p className="scq-line scq-warn">
          <T en={`Serious warning: ${warnEn}`} bn={`গুরুতর সতর্কতা: ${warnBn}`} />
        </p>
      )}
      <div className="scq-acts">
        <Link href={`/stock/${code}#ch-analysis`} className="btn-primary btn-sm" onClick={() => onOpen?.(row.code)}>
          <T en="Read our full analysis" bn="পুরো বিশ্লেষণ পড়ুন" />
        </Link>
        <Link href={`/compare-stocks?s=${code}`} className="btn-quiet btn-sm" onClick={() => onOpen?.(row.code)}>
          <T en="Compare" bn="তুলনা করুন" />
        </Link>
        <Button variant="quiet" size="sm" onClick={() => openWatchRules(row.code, row.name, { ltp: price })}>
          <T en="Watch" bn="নজর রাখুন" />
        </Button>
      </div>
    </div>
  );
}
