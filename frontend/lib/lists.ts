/**
 * One way to open a list (2026-11-25, step 4 of the simplify review
 * https://claude.ai/artifact/VG8A1sU8F5q9grFDCsrHnb, idea 4 "One place to
 * find shares: Lists").
 *
 * Every list of shares on the site — the Buy List, All companies, Results,
 * Based on your shares, the six research reports and the 16 ready lists on
 * /lists — opens in the same view: one bar (Sector · Share price · Sort by,
 * plus the list's own chips or a search where it has them) over the same rows
 * (# · company + why · price today · the list's key figure). The view is
 * `components/lists/ListView.tsx`; this file holds its plain data and rules,
 * so the server pages can build rows without React.
 */
import { getTier, type TierKey } from "@/lib/constants";

export type Bi = { en: string; bn: string };
export type FigTone = "positive" | "negative" | "watch" | "gold" | "";

/** One share in a list. `data` carries the page's own item for its renderers. */
export interface ListRow<T = unknown> {
  code: string;
  name: string;
  sector?: string | null;
  tier?: TierKey | null;
  /** The latest official close and today's change (%). */
  price?: number | null;
  change?: number | null;
  /** The list's key figure as shown; null draws "—". `words`: a phrase, not a number (drawn smaller). */
  fig?: (Bi & { tone?: FigTone; words?: boolean }) | null;
  /** Values the sort options read, by key. A missing value sorts last. */
  sort?: Record<string, number | string | null | undefined>;
  /** Why it is on the list, in one short line. */
  why?: Bi | null;
  /** A fixed number for the row (the ranking's real place); else its position. */
  rank?: number;
  /** Joined this week / posted today. */
  isNew?: boolean;
  /** Chip ids this row belongs to (the list's own filter). */
  tags?: string[];
  /** Where the row's link lands on the stock page ("#an-safety"). */
  hash?: string;
  data?: T;
}

export interface ListSort {
  id: string;
  label: Bi;
  dir: "asc" | "desc";
}

export interface ListChip {
  id: string;
  label: Bi;
}

/** The share-price choices, the same four the screener's filter offers. */
export const PRICE_PRESETS: { min: number | null; max: number | null; en: string; bn: string }[] = [
  { min: null, max: 20, en: "Under ৳20", bn: "৳20-এর কম" },
  { min: 20, max: 50, en: "৳20 to ৳50", bn: "৳20 থেকে ৳50" },
  { min: 50, max: 200, en: "৳50 to ৳200", bn: "৳50 থেকে ৳200" },
  { min: 200, max: null, en: "Over ৳200", bn: "৳200-এর বেশি" },
];

/** "Company, A to Z" — every list can sort by name. */
export const SORT_NAME: ListSort = { id: "name", label: { en: "Company, A to Z", bn: "কোম্পানি, নাম অনুযায়ী" }, dir: "asc" };
/** "Share price, low to high". */
export const SORT_PRICE: ListSort = { id: "price", label: { en: "Share price, low to high", bn: "শেয়ারের দাম, কম থেকে বেশি" }, dir: "asc" };
/** "Today's change". */
export const SORT_CHANGE: ListSort = { id: "change", label: { en: "Today's change", bn: "আজকের দাম বদল" }, dir: "desc" };

export function inPrice(price: number | null | undefined, i: number): boolean {
  const p = PRICE_PRESETS[i];
  if (!p) return true;
  if (price == null || !Number.isFinite(price)) return false;
  if (p.min != null && price < p.min) return false;
  if (p.max != null && price >= p.max) return false;
  return true;
}

function sortValue(r: ListRow, id: string): number | string | null {
  if (id === "name") return r.name.toLowerCase();
  if (id === "price") return r.price ?? null;
  if (id === "change") return r.change ?? null;
  if (id === "rank") return r.rank ?? null;
  const v = r.sort?.[id];
  return v == null || (typeof v === "number" && !Number.isFinite(v)) ? null : v;
}

/** Sort a copy of the rows; a missing value always goes last, ties keep the list's order. */
export function sortRows<T>(rows: ListRow<T>[], sort: ListSort | null): ListRow<T>[] {
  if (!sort) return rows;
  const sign = sort.dir === "asc" ? 1 : -1;
  return rows
    .map((r, i) => ({ r, i, v: sortValue(r, sort.id) }))
    .sort((a, b) => {
      if (a.v == null && b.v == null) return a.i - b.i;
      if (a.v == null) return 1;
      if (b.v == null) return -1;
      const c = typeof a.v === "string" || typeof b.v === "string"
        ? String(a.v).localeCompare(String(b.v))
        : (a.v as number) - (b.v as number);
      return c !== 0 ? c * sign : a.i - b.i;
    })
    .map((x) => x.r);
}

export interface ListFilter {
  sector: string;
  price: number;   // index into PRICE_PRESETS, −1 = any
  chip: string;    // "" = all
  q: string;
}

export function passesFilter(r: ListRow, f: ListFilter, chipTest?: (r: ListRow, chip: string) => boolean): boolean {
  if (f.sector && (r.sector ?? "") !== f.sector) return false;
  if (f.price >= 0 && !inPrice(r.price, f.price)) return false;
  if (f.chip) {
    const ok = chipTest ? chipTest(r, f.chip) : (r.tags ?? []).includes(f.chip);
    if (!ok) return false;
  }
  const q = f.q.trim().toLowerCase();
  if (q && !r.code.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false;
  return true;
}

/** "27%" with one decimal under 10, none from 10. */
export function pct(x: number | null | undefined, signed = false): string | null {
  if (x == null || !Number.isFinite(x)) return null;
  const a = Math.abs(x);
  const s = a < 10 ? (Math.round(a * 10) / 10).toString() : Math.round(a).toString();
  const sign = signed ? (x > 0 ? "+" : x < 0 ? "−" : "") : x < 0 ? "−" : "";
  return `${sign}${s}%`;
}

/** The same figure in both languages (numbers read the same in Bengali). */
export const same = (s: string, tone: FigTone = ""): Bi & { tone: FigTone } => ({ en: s, bn: s, tone });

/** The one dash for "no figure". */
export const NO_FIG: Bi = { en: "—", bn: "—" };

/** Today's price, move, sector and group for a code: what a research list's
 *  rows borrow from the scores (the reports carry no prices). */
export interface Quote {
  price: number | null;
  change: number | null;
  sector: string | null;
  tier: TierKey | null;
}
export type Quotes = Record<string, Quote>;

const TIER_SET = new Set(["excellent", "good", "average", "weak"]);
export const asTier = (t: string | null | undefined): TierKey | null => (t && TIER_SET.has(t) ? (t as TierKey) : null);

/** The quotes for the codes a page shows, from `/api/scores` (server side, so
 *  only what the page needs reaches the browser). */
export function quotesFor(
  items: { trading_code: string; ltp: number | null; change_pct: number | null; sector: string | null; score: number | null }[],
  codes: Iterable<string>,
): Quotes {
  const want = new Set([...codes].map((c) => c.toUpperCase()));
  const out: Quotes = {};
  for (const i of items) {
    const c = i.trading_code.toUpperCase();
    if (!want.has(c)) continue;
    out[c] = { price: i.ltp, change: i.change_pct, sector: i.sector, tier: i.score != null ? getTier(i.score) : null };
  }
  return out;
}

/** Fill a row's price, move, sector and group from its quote where it has none. */
export function withQuote<T>(row: ListRow<T>, quotes?: Quotes | null): ListRow<T> {
  const q = quotes?.[row.code.toUpperCase()];
  if (!q) return row;
  return {
    ...row,
    price: row.price ?? q.price,
    change: row.change ?? q.change,
    sector: row.sector ?? q.sector,
    tier: row.tier ?? q.tier,
  };
}
