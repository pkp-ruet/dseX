"use client";

import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import ListRows, { LIST_PAGE } from "@/components/lists/ListRows";
import { openWatchRules } from "@/components/watch-rules/store";
import { T } from "@/components/i18n/T";
import type { ScreenerFilterDef } from "@/lib/api";
import { TIER_LABELS, type TierKey } from "@/lib/constants";
import { money } from "@/lib/formatters";
import type { FigTone, ListRow } from "@/lib/lists";
import { cell, keyHead, type Bi, type Figure, type ScreenerRow } from "@/lib/screener";

/** Rows per "Show more". */
export const PAGE = LIST_PAGE;

const tierOf = (v: unknown): TierKey | null =>
  typeof v === "string" && v in TIER_LABELS ? (v as TierKey) : null;

/**
 * A list's shares in the /lists pop-up (2026-11-24 design, "clean and easy
 * to read"; since 2026-11-25 drawn by the shared `ListRows`, so the screener
 * lists and every other list on the site have one row). This adapter turns
 * the screener's packed rows into list rows: the list's key figure, why it is
 * on the list, the reader's H / ★.
 *
 * - `masked` — a reader without Premium sees the rows as they are, every
 *   figure and the reason, but the company as a grey bar;
 * - `peek` — a Premium reader taps a row to open its quick look in place
 *   (our six analysis words, the fair price range, the one serious warning,
 *   then Read our analysis · Compare · Watch); one open at a time;
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
  pick = null,
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
  /** The bar's Compare box is on: rows tick instead of opening (2026-11-25). */
  pick?: { picked: string[]; onPick: (code: string) => void; full: boolean } | null;
}) {
  const def = defs.get(keyFig);
  const head = keyHead(keyFig, def);
  const list: ListRow<ScreenerRow>[] = rows.slice(0, masked ? limit : rows.length).map((r) => {
    const v = r.v[keyFig];
    const num = typeof v === "number" ? v : null;
    const tone: FigTone = def?.signed && num ? (num > 0 ? "positive" : "negative") : "";
    return {
      code: r.code,
      name: r.name,
      sector: typeof r.v.sector === "string" ? r.v.sector : null,
      tier: tierOf(r.v.grade),
      price: typeof r.v.price === "number" ? r.v.price : null,
      change: typeof r.v.change === "number" ? r.v.change : null,
      fig: def ? { en: cell(v ?? null, def), bn: cell(v ?? null, def, true), tone } : null,
      why: reasonOf?.(r) ?? null,
      isNew: newCodes?.has(r.code) ?? false,
      data: r,
    };
  });

  return (
    <ListRows
      rows={list}
      figHead={head}
      limit={limit}
      onMore={onMore}
      masked={masked}
      renderOpen={peek ? (row) => <QuickLook row={row.data!} onOpen={onOpen} /> : undefined}
      onLeave={onOpen}
      pick={pick}
    />
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
