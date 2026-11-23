import type {
  ScreenerFilter, ScreenerFilterDef, ScreenerReady, ScreenerSpec, ScreenerUniverse, ScreenerUnit,
} from "@/lib/api";
import { dayShort } from "@/components/dividend-calendar/dates";

/**
 * The stock screener's rules in the browser (2026-11-01). `GET /api/screener`
 * ships every company's figures once; filtering, the count under every
 * choice and the order all happen here, so nothing waits on a request.
 * Mirrors backend `services/screener.py` (`matches`, `apply`, `fmt`,
 * `range_words`) — saved screens and their daily alert run there. Keep the
 * two in step.
 */

export type Figure = number | string | null;

export interface ScreenerRow {
  code: string;
  name: string;
  /** {filter key: figure} */
  v: Record<string, Figure>;
}

export type Bi = { en: string; bn: string };

export const DEFAULT_SORT = "mcap";
export const EMPTY_SPEC: ScreenerSpec = { v: 2, filters: [], sort: DEFAULT_SORT, dir: "desc" };

/** The packed rows ([code, name, figure …]) as objects. */
export function unpackRows(u: Pick<ScreenerUniverse, "cols" | "rows">): ScreenerRow[] {
  return u.rows.map((r) => {
    const v: Record<string, Figure> = {};
    u.cols.forEach((k, i) => { v[k] = r[i + 2] ?? null; });
    return { code: String(r[0]), name: String(r[1] ?? r[0]), v };
  });
}

/** Passes the filter. A missing figure fails an active filter. */
export function passes(v: Record<string, Figure>, f: ScreenerFilter): boolean {
  const x = v[f.key];
  if (x == null) return false;
  if (f.in) return f.in.includes(String(x));
  if (typeof x !== "number") return false;
  if (f.min != null && x < f.min) return false;
  if (f.max != null && x > f.max) return false;
  return true;
}

export const matches = (v: Record<string, Figure>, filters: ScreenerFilter[]) => filters.every((f) => passes(v, f));

/** The rows that pass, in the spec's order: a missing figure sorts last, ties by code. */
export function applyScreen(rows: ScreenerRow[], spec: ScreenerSpec): ScreenerRow[] {
  const kept = rows.filter((r) => matches(r.v, spec.filters));
  const desc = spec.dir === "desc";
  if (spec.sort === "name") {
    return kept.sort((a, b) => {
      const c = a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.code.localeCompare(b.code);
      return desc ? -c : c;
    });
  }
  const key = spec.sort;
  return kept.sort((a, b) => {
    const x = a.v[key], y = b.v[key];
    if (x == null && y == null) return a.code.localeCompare(b.code);
    if (x == null) return 1;
    if (y == null) return -1;
    const d = (x as number) - (y as number);
    if (d !== 0) return desc ? -d : d;
    return a.code.localeCompare(b.code);
  });
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

function trim(n: number, decimals: number): string {
  const s = n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  return s;
}

/** A figure the way a chip says it: ৳12.5 · 5% · 10 · ৳500 crore · ৳50 lakh. */
export function fmt(v: number, unit: ScreenerUnit, decimals = 1, bn = false): string {
  const s = trim(v, decimals);
  switch (unit) {
    case "taka": return `৳${s}`;
    case "pct": return `${s}%`;
    case "crore": return `৳${s} ${bn ? "কোটি" : "crore"}`;
    case "lakh": return v >= 100 ? fmt(v / 100, "crore", 1, bn) : `৳${s} ${bn ? "লাখ" : "lakh"}`;
    case "paid": return `${s} ${bn ? "বছর" : s === "1" ? "year" : "years"}`;
    case "days": return `${s} ${bn ? "দিন" : s === "1" ? "day" : "days"}`;
    default: return s;
  }
}

/** The unit a column head carries, so its cells can be bare numbers. */
export function headUnit(def: ScreenerFilterDef, bn = false): string | null {
  if (def.unit === "crore") return bn ? "৳ কোটি" : "৳ crore";
  if (def.unit === "lakh") return bn ? "৳ লাখ" : "৳ lakh";
  return null;
}

/** A figure in a table cell: a signed one carries its +, "2 years" reads
 *  "2 or fewer", crore / lakh are bare numbers (the head says the unit). */
export function cell(v: Figure, def: ScreenerFilterDef, bn = false): string {
  if (v == null) return "—";
  if (typeof v !== "number") return v;
  if (def.unit === "paid") return v <= 2 ? (bn ? "2 বা কম" : "2 or fewer") : `${v} / 5`;
  if (headUnit(def)) return trim(v, def.decimals);
  const s = fmt(v, def.unit, def.decimals, bn);
  return def.signed && v > 0 ? `+${s}` : s;
}

/** A share's figure on one filter in words: "Low price", "9.6", "4.2%". */
export function figureWords(v: Figure, def: ScreenerFilterDef): Bi {
  if (v == null) return { en: "no figure", bn: "তথ্য নেই" };
  if (def.kind === "set") {
    const o = def.options.find((x) => x.value === String(v));
    return { en: o?.en ?? String(v), bn: o?.bn ?? String(v) };
  }
  return { en: cell(v, def), bn: cell(v, def, true) };
}

/** A range in words: its preset's label when it is one, else "10 or less" / "5% or more" / "10 to 15". */
export function rangeWords(def: ScreenerFilterDef, min: number | null | undefined, max: number | null | undefined): Bi {
  const lo = min ?? null, hi = max ?? null;
  const p = def.presets.find((x) => x.min === lo && x.max === hi);
  if (p) return { en: p.en, bn: p.bn };
  const one = (bn: boolean) => {
    const a = lo != null ? fmt(lo, def.unit, def.decimals, bn) : null;
    const b = hi != null ? fmt(hi, def.unit, def.decimals, bn) : null;
    if (a && b) return bn ? `${a} থেকে ${b}` : `${a} to ${b}`;
    if (a) return bn ? `${a} বা বেশি` : `${a} or more`;
    return bn ? `${b} বা কম` : `${b} or less`;
  };
  return { en: one(false), bn: one(true) };
}

/** What a filter keeps, without its name: "Under 10", "Bank, Cement", "not Z". */
export function valueWords(f: ScreenerFilter, def: ScreenerFilterDef): Bi {
  if (def.kind === "range") return rangeWords(def, f.min, f.max);
  const vals = f.in ?? [];
  if (def.key === "category" && vals.join() === "A,B,N") return { en: "not Z", bn: "Z ছাড়া" };
  const by = new Map(def.options.map((o) => [o.value, o]));
  const list = (bn: boolean) => {
    const names = vals.map((v) => (bn ? by.get(v)?.bn : by.get(v)?.en) ?? v);
    return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
  };
  return { en: list(false), bn: list(true) };
}

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------

const sameFilter = (a: ScreenerFilter, b: ScreenerFilter) =>
  a.key === b.key && (a.min ?? null) === (b.min ?? null) && (a.max ?? null) === (b.max ?? null)
  && (a.in ?? []).join("|") === (b.in ?? []).join("|");

/** Same filters (any order) and the same order of rows. */
export function sameSpec(a: ScreenerSpec, b: ScreenerSpec): boolean {
  return a.sort === b.sort && a.dir === b.dir && a.filters.length === b.filters.length
    && a.filters.every((f) => b.filters.some((g) => sameFilter(f, g)));
}

/** The ready-made screen whose filters these are (the order may differ). */
export function matchReady(spec: ScreenerSpec, ready: ScreenerReady[]): ScreenerReady | undefined {
  return ready.find((r) => r.spec.filters.length === spec.filters.length
    && r.spec.filters.every((f) => spec.filters.some((g) => sameFilter(f, g))));
}

/** Put a filter in (replacing the one on the same figure) or take it out (null). */
export function setFilter(spec: ScreenerSpec, key: string, f: ScreenerFilter | null): ScreenerSpec {
  const i = spec.filters.findIndex((x) => x.key === key);
  const filters = [...spec.filters];
  if (f && i >= 0) filters[i] = f;
  else if (f) filters.push(f);
  else if (i >= 0) filters.splice(i, 1);
  return { ...spec, filters };
}

const num = (s: string): number | null => {
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** `pe:~10,yield:5~,sector:Bank|Cement` — a screen in the URL, so a link restores it. */
export function encodeFilters(filters: ScreenerFilter[]): string {
  return filters.map((f) => f.in
    ? `${f.key}:${f.in.map(encodeURIComponent).join("|")}`
    : `${f.key}:${f.min ?? ""}~${f.max ?? ""}`).join(",");
}

export function decodeFilters(raw: string, defs: Map<string, ScreenerFilterDef>): ScreenerFilter[] {
  const out: ScreenerFilter[] = [];
  for (const part of raw.split(",")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    const key = part.slice(0, i);
    const val = part.slice(i + 1);
    const def = defs.get(key);
    if (!def || out.some((f) => f.key === key)) continue;
    if (def.kind === "set") {
      const allowed = new Set(def.options.map((o) => o.value));
      const vals = val.split("|").map((x) => { try { return decodeURIComponent(x); } catch { return ""; } })
        .filter((x) => allowed.has(x));
      if (vals.length) out.push({ key, in: vals });
      continue;
    }
    const [a = "", b = ""] = val.split("~");
    const min = num(a), max = num(b);
    if (min == null && max == null) continue;
    out.push({ key, ...(min != null ? { min } : {}), ...(max != null ? { max } : {}) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Almost there (Premium): one filter away, and the price that brings it in.
// Mirrors backend `screener.join_price` / `near_misses`.
// ---------------------------------------------------------------------------

/** "Almost there" lists shares a fall of at most this much would bring in. */
export const NEAR_FALL_PCT = 10;

const numOf = (x: Figure): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);

/** The highest price at which the share would pass `f` on today's other
 *  figures, when a lower price is what it takes; null when the filter doesn't
 *  move with the price, a rise would be needed, or a figure is missing. */
export function joinPrice(v: Record<string, Figure>, f: ScreenerFilter): number | null {
  const price = numOf(v.price);
  if (!price || price <= 0) return null;
  const lo = f.min ?? null, hi = f.max ?? null;
  let out: number | null = null;
  if (f.key === "price" && hi != null) out = hi;
  else if ((f.key === "pe" || f.key === "pb" || f.key === "mcap") && hi != null) {
    const x = numOf(v[f.key]);
    out = x && x > 0 ? (price * hi) / x : null;
  } else if (f.key === "yield" && lo != null && lo > 0) {
    const x = numOf(v.yield);
    out = x && x > 0 ? (price * x) / lo : null;
  } else if (f.key === "range_pos" && hi != null) {
    const a = numOf(v.lo52), b = numOf(v.hi52);
    out = a != null && b != null && b > a ? a + ((b - a) * hi) / 100 : null;
  } else if (f.key === "from_low" && hi != null) {
    const a = numOf(v.lo52);
    out = a && a > 0 ? a * (1 + hi / 100) : null;
  } else if (f.key === "price_word" && f.in?.length) {
    out = numOf(f.in.includes("low") ? v.low_below : f.in.includes("fair") ? v.high_above : null);
  }
  if (out == null || out <= 0 || out >= price) return null;
  return Math.round(out * 100) / 100;
}

export interface NearMiss {
  row: ScreenerRow;
  /** The one filter it misses. */
  filter: ScreenerFilter;
  join: number;
  fallPct: number;
}

/** Shares that fail exactly one filter a lower price would fix, within
 *  `maxFall` % of today, closest first. */
export function nearMisses(rows: ScreenerRow[], spec: ScreenerSpec, maxFall = NEAR_FALL_PCT): NearMiss[] {
  const out: NearMiss[] = [];
  for (const r of rows) {
    const failed = spec.filters.filter((f) => !passes(r.v, f));
    if (failed.length !== 1) continue;
    const j = joinPrice(r.v, failed[0]);
    const price = numOf(r.v.price);
    if (j == null || !price) continue;
    const fallPct = ((price - j) / price) * 100;
    if (fallPct <= maxFall) out.push({ row: r, filter: failed[0], join: j, fallPct });
  }
  return out.sort((a, b) => a.fallPct - b.fallPct || a.row.code.localeCompare(b.row.code));
}

// ---------------------------------------------------------------------------
// One reason per row (2026-11-23): why a share is on the screen, in words,
// from the figures the screen picks on. On phones it replaces the bare
// figure lines.
// ---------------------------------------------------------------------------

/** Figures a reason never names: the group word sits beside the code, and a
 *  sector, a category or our score says nothing about why it fits. */
const NO_REASON = new Set(["grade", "sector", "category", "score"]);
/** Parts a reason line holds at most. */
export const REASON_PARTS = 3;

const r1 = (x: number) => trim(Math.round(x * 10) / 10, 1);
const r0 = (x: number) => trim(Math.round(x), 0);

/** One figure as a short plain phrase, or null when it says nothing. */
export function reasonPart(key: string, v: Record<string, Figure>, def?: ScreenerFilterDef): Bi | null {
  const x = v[key];
  if (x == null || NO_REASON.has(key)) return null;
  const n = typeof x === "number" ? x : null;
  switch (key) {
    case "price_word":
      return x === "low" ? { en: "Low price for what it earns", bn: "আয়ের তুলনায় দাম কম" }
        : x === "fair" ? { en: "Fair price", bn: "ন্যায্য দাম" }
        : { en: "High price", bn: "দাম বেশি" };
    case "warnings":
      return x === "none" ? { en: "No serious warnings", bn: "গুরুতর সতর্কতা নেই" }
        : { en: "Has a serious warning", bn: "গুরুতর সতর্কতা আছে" };
    case "div_safety":
      return x === "safe" ? { en: "Dividend looks steady", bn: "ডিভিডেন্ড স্থিতিশীল মনে হচ্ছে" }
        : x === "watch" ? { en: "Dividend worth a check", bn: "ডিভিডেন্ড যাচাই করে নিন" }
        : { en: "Dividend at risk", bn: "ডিভিডেন্ড ঝুঁকিতে" };
    case "cash_backed":
      return x === "yes" ? { en: "Profit came in as cash", bn: "মুনাফা নগদে এসেছে" }
        : x === "partly" ? { en: "Profit partly in cash", bn: "মুনাফার কিছুটা নগদে এসেছে" }
        : { en: "Profit mostly on paper", bn: "মুনাফা বেশিরভাগই কাগজে" };
    case "owners":
      return x === "bought" ? { en: "Owners bought more than they sold", bn: "মালিকরা বেচার চেয়ে বেশি কিনেছেন" }
        : x === "sold" ? { en: "Owners sold more than they bought", bn: "মালিকরা কেনার চেয়ে বেশি বেচেছেন" }
        : { en: "No trades by its owners", bn: "মালিকদের কোনো লেনদেন নেই" };
  }
  if (n == null) return null;
  switch (key) {
    case "price":
      return { en: `Price ${fmt(n, "taka", 1)}`, bn: `দাম ${fmt(n, "taka", 1)}` };
    case "change":
      return { en: `Today ${n > 0 ? "+" : ""}${r1(n)}%`, bn: `আজ ${n > 0 ? "+" : ""}${r1(n)}%` };
    case "pe":
      return { en: `Price is ${r1(n)} years of profit`, bn: `দামে ${r1(n)} বছরের মুনাফা` };
    case "pb":
      return n < 1 ? { en: "Priced under what it owns", bn: "সম্পদের চেয়ে কম দামে" }
        : { en: `Priced at ${trim(n, 1)} times what it owns`, bn: `সম্পদের ${trim(n, 1)} গুণ দামে` };
    case "range_pos": {
      const price = numOf(v.price), lo = numOf(v.lo52), hi = numOf(v.hi52);
      if (n <= 50 && price && lo && lo > 0) {
        const up = ((price - lo) / lo) * 100;
        return up < 1 ? { en: "At its lowest price of the year", bn: "বছরের সর্বনিম্ন দামে" }
          : { en: `${r0(up)}% above its yearly low`, bn: `বছরের সর্বনিম্নের চেয়ে ${r0(up)}% ওপরে` };
      }
      if (price && hi && hi > 0) {
        const down = ((hi - price) / hi) * 100;
        return down < 1 ? { en: "At its highest price of the year", bn: "বছরের সর্বোচ্চ দামে" }
          : { en: `${r0(down)}% below its yearly high`, bn: `বছরের সর্বোচ্চের চেয়ে ${r0(down)}% নিচে` };
      }
      return null;
    }
    case "from_high":
      return n < 0.5 ? { en: "At its 52-week high", bn: "52 সপ্তাহের সর্বোচ্চ দামে" }
        : { en: `${r1(n)}% below its 52-week high`, bn: `52 সপ্তাহের সর্বোচ্চের চেয়ে ${r1(n)}% নিচে` };
    case "from_low":
      return n < 0.5 ? { en: "At its 52-week low", bn: "52 সপ্তাহের সর্বনিম্ন দামে" }
        : { en: `${r1(n)}% above its 52-week low`, bn: `52 সপ্তাহের সর্বনিম্নের চেয়ে ${r1(n)}% ওপরে` };
    case "owners_pct":
      return { en: `Founders and directors own ${r0(n)}%`, bn: `উদ্যোক্তা ও পরিচালকদের হাতে ${r0(n)}%` };
    case "ret_1y":
      return n >= 0 ? { en: `Price up ${r0(n)}% in a year`, bn: `1 বছরে দাম ${r0(n)}% বেড়েছে` }
        : { en: `Price down ${r0(-n)}% in a year`, bn: `1 বছরে দাম ${r0(-n)}% কমেছে` };
    case "yield":
      return n > 0 ? { en: `${r1(n)}% a year in cash`, bn: `বছরে ${r1(n)}% নগদ` }
        : { en: "No cash dividend", bn: "নগদ ডিভিডেন্ড নেই" };
    case "paid":
      return n >= 5 ? { en: "Paid cash all 5 years", bn: "5 বছরই নগদ দিয়েছে" }
        : n >= 3 ? { en: `Paid cash ${n} of 5 years`, bn: `5 বছরে ${n} বছর নগদ দিয়েছে` }
        : { en: "Paid cash 2 of 5 years or fewer", bn: "5 বছরে 2 বছর বা কম নগদ দিয়েছে" };
    case "record_days": {
      const when = n === 0 ? { en: "Record date today", bn: "আজ রেকর্ড ডেট" }
        : n === 1 ? { en: "Record date tomorrow", bn: "আগামীকাল রেকর্ড ডেট" }
        : { en: `Record date in ${n} days`, bn: `${n} দিন পর রেকর্ড ডেট` };
      const by = typeof v.buy_by === "string" ? dayShort(v.buy_by) : null;
      return by ? { en: `${when.en}, buy by ${by.en}`, bn: `${when.bn}, কিনতে হবে ${by.bn}-এর মধ্যে` } : when;
    }
    case "eps":
      return n < 0 ? { en: `A loss of ${fmt(-n, "taka", 2)} a share`, bn: `শেয়ারপ্রতি ${fmt(-n, "taka", 2)} লোকসান` }
        : { en: `Profit ${fmt(n, "taka", 2)} a share`, bn: `শেয়ারপ্রতি মুনাফা ${fmt(n, "taka", 2)}` };
    case "profit_change":
      return Math.abs(n) < 1 ? { en: "Profit about the same", bn: "মুনাফা প্রায় একই" }
        : n > 0 ? { en: `Profit up ${r0(n)}%`, bn: `মুনাফা ${r0(n)}% বেড়েছে` }
        : { en: `Profit down ${r0(-n)}%`, bn: `মুনাফা ${r0(-n)}% কমেছে` };
    case "roe":
      return { en: `Earns ${r0(n)}% on its owners' money`, bn: `মালিকদের টাকায় ${r0(n)}% মুনাফা` };
    case "mcap":
      return { en: `Worth ${fmt(n, "crore", 0)}`, bn: `মূল্য ${fmt(n, "crore", 0, true)}` };
    case "turnover":
      return { en: `${fmt(n, "lakh", 0)} traded a day`, bn: `দিনে ${fmt(n, "lakh", 0, true)} লেনদেন` };
    case "loans":
      return n < 1 ? { en: "Almost no loans", bn: "প্রায় ঋণ নেই" }
        : { en: `Loans ${r0(n)}% of its value`, bn: `ঋণ বাজারমূল্যের ${r0(n)}%` };
  }
  if (!def) return null;
  const w = figureWords(x, def);
  return { en: `${def.short_en} ${w.en}`, bn: `${def.short_bn} ${w.bn}` };
}

/** Why a share is on the screen: the figures `filters` pick on (the list's
 *  first, then the reader's own), as up to REASON_PARTS short phrases. With a
 *  list picked, a short line is topped up with the list's own figure, then
 *  the cash it pays and the years of profit in its price. Null when there is
 *  nothing worth saying (e.g. a screen on sector alone). */
export function rowReason(
  row: ScreenerRow,
  filters: ScreenerFilter[],
  defs: Map<string, ScreenerFilterDef>,
  list?: ScreenerReady,
  /** The figure the row already shows big (its key figure): not said twice. */
  skip?: string,
): Bi | null {
  const keys: string[] = [];
  const add = (k: string) => { if (k !== skip && !keys.includes(k)) keys.push(k); };
  filters.forEach((f) => add(f.key));
  if (list) [list.metric, "yield", "pe"].forEach(add);
  const parts: Bi[] = [];
  for (const k of keys) {
    if (parts.length >= REASON_PARTS) break;
    // Fill-ups only until the line has two parts; the screen's own figures always count.
    const filler = list && !filters.some((f) => f.key === k);
    if (filler && parts.length >= 2) break;
    const p = reasonPart(k, row.v, defs.get(k));
    if (p) parts.push(p);
  }
  if (!parts.length) return null;
  return { en: parts.map((p) => p.en).join(" · "), bn: parts.map((p) => p.bn).join(" · ") };
}

// ---------------------------------------------------------------------------
// Watch (2026-11-23, widened 2026-11-24): one tap saves what the pop-up shows
// — a list, plus a sector or a price if picked — as a screen with its daily
// alert, named for it, no name to type.
// ---------------------------------------------------------------------------

/** The saved spec of what the pop-up shows: the list's rules, the reader's
 *  sector / price (and any other filter a link brought), the safety rules. */
export function screenWatchSpec(g: ScreenerReady | undefined, own: ScreenerFilter[]): ScreenerSpec {
  const filters = withSafety(mergeFilters([...(g?.spec.filters ?? []), ...own]));
  return {
    v: 2, filters, sort: g?.spec.sort ?? DEFAULT_SORT, dir: g?.spec.dir ?? "desc",
    lists: g ? [g.id] : [], own, safe: true,
  };
}

/** Its name on the saved card: "Lowest P/E · Bank · Under ৳20" (40 characters at most). */
export function screenWatchName(g: ScreenerReady | undefined, own: ScreenerFilter[], defs: Map<string, ScreenerFilterDef>, bn: boolean): string {
  const parts = [g ? (bn ? g.title_bn : g.title_en) : (bn ? "সব শেয়ার" : "Every share")];
  for (const f of own) {
    const d = defs.get(f.key);
    if (d) parts.push(bn ? valueWords(f, d).bn : valueWords(f, d).en);
  }
  return parts.join(" · ").slice(0, 40);
}

/** A saved screen that is exactly this list with exactly these filters of the reader's own. */
export function isScreenWatch(spec: unknown, lists: string[], own: ScreenerFilter[]): boolean {
  const s = spec as Partial<ScreenerSpec> | null;
  if (!s || !Array.isArray(s.filters) || s.safe === false) return false;
  const sl = s.lists ?? [];
  if (sl.length !== lists.length || sl.some((x, i) => x !== lists[i])) return false;
  const so = s.own ?? [];
  return so.length === own.length && so.every((f) => own.some((g) => sameFilter(f, g)));
}

// ---------------------------------------------------------------------------
// The key figure (2026-11-24): the one number a list is about, shown big on
// each row of the pop-up, its plain name once in the list's header.
// ---------------------------------------------------------------------------

/** Lists whose own figure says less than another one: "Strong, near its low"
 *  reads better as how far above the low; "Owners are buying" as how much
 *  the founders own. */
const KEY_OVERRIDE: Record<string, string> = { strong_near_low: "from_low", owners_buying: "owners_pct" };
/** Orders that are never the key figure (the row shows price and today's move anyway). */
const NOT_KEY = new Set(["name", "price", "change"]);

/** The figure a row shows big: the order a member picked, else the list's own figure. */
export function keyOf(list: ScreenerReady | undefined, sort: string | null, defs: Map<string, ScreenerFilterDef>): string {
  if (sort && !NOT_KEY.has(sort) && defs.get(sort)?.kind === "range") return sort;
  if (list) return KEY_OVERRIDE[list.id] ?? list.metric;
  return "mcap";
}

/** The key figure's column name in plain words (+ the unit when the cells are bare numbers). */
const KEY_HEAD: Record<string, Bi> = {
  pe: { en: "Years of profit (P/E)", bn: "কত বছরের মুনাফা (পিই)" },
  pb: { en: "Price vs what it owns (P/B)", bn: "সম্পদের তুলনায় দাম (পিবি)" },
  yield: { en: "Cash a year", bn: "বছরে নগদ" },
  paid: { en: "Years it paid cash", bn: "যত বছর নগদ দিয়েছে" },
  record_days: { en: "Record date in", bn: "রেকর্ড ডেট বাকি" },
  mcap: { en: "Company value", bn: "কোম্পানির মূল্য" },
  turnover: { en: "Traded a day", bn: "দিনে লেনদেন" },
  profit_change: { en: "Profit change", bn: "মুনাফা বদল" },
  loans: { en: "Loans vs its value", bn: "মূল্যের তুলনায় ঋণ" },
  owners_pct: { en: "Founders own", bn: "উদ্যোক্তাদের হাতে" },
  from_high: { en: "Below 52-week high", bn: "52 সপ্তাহের সর্বোচ্চ থেকে নিচে" },
  from_low: { en: "Above 52-week low", bn: "52 সপ্তাহের সর্বনিম্ন থেকে ওপরে" },
  range_pos: { en: "Place in its year", bn: "বছরে দামের অবস্থান" },
  ret_1y: { en: "1-year change", bn: "1 বছরের বদল" },
  eps: { en: "Profit a share", bn: "শেয়ারপ্রতি মুনাফা" },
  roe: { en: "Profit on owners' money", bn: "মালিকদের টাকায় মুনাফা" },
  score: { en: "Our score", bn: "আমাদের স্কোর" },
};

export function keyHead(key: string, def: ScreenerFilterDef | undefined): Bi {
  const h = KEY_HEAD[key] ?? (def ? { en: def.short_en, bn: def.short_bn } : { en: key, bn: key });
  if (!def) return h;
  const ue = headUnit(def), ub = headUnit(def, true);
  return { en: ue ? `${h.en} (${ue})` : h.en, bn: ub ? `${h.bn} (${ub})` : h.bn };
}

/** Every list with a tile, in the backend's order (2026-11-24: one set of
 *  tiles, our lists and the simple ones together). An older backend without
 *  the flags gets its ready-made screens. */
export function listScreens(ready: ScreenerReady[]): ScreenerReady[] {
  const cards = ready.filter((r) => r.goal || r.basic);
  return cards.length ? cards : ready;
}

// ---------------------------------------------------------------------------
// The safety rules and the quick ways to narrow a list (2026-11-14, user:
// "lots of filters and complicated things"). Mirrors backend
// `screener.SAFETY` / `with_safety`.
// ---------------------------------------------------------------------------

/** Leave out Z shares and shares that hardly trade (under ৳10 lakh a day). */
export const SAFETY: ScreenerFilter[] = [
  { key: "category", in: ["A", "B", "N"] },
  { key: "turnover", min: 10 },
];

/** `filters` plus the safety rules, unless the reader set that figure
 *  themselves ("Category A only" is stricter than "not Z"). */
export function withSafety(filters: ScreenerFilter[], on = true): ScreenerFilter[] {
  if (!on) return filters;
  const keys = new Set(filters.map((f) => f.key));
  return [...filters, ...SAFETY.filter((r) => !keys.has(r.key))];
}

/** A saved or linked screen's filters without the safety rules, and whether
 *  it had both (then the switch is on). */
export function stripSafety(filters: ScreenerFilter[]): { filters: ScreenerFilter[]; safe: boolean } {
  const isRule = (f: ScreenerFilter) => SAFETY.some((r) => sameFilter(r, f));
  const safe = SAFETY.every((r) => filters.some((f) => sameFilter(r, f)));
  return { filters: safe ? filters.filter((f) => !isRule(f)) : filters, safe };
}

/** The three quick ways to narrow a list: a sector, a share price, category A only. */
export const REFINE_KEYS = ["sector", "price", "category"] as const;
export const A_ONLY: ScreenerFilter = { key: "category", in: ["A"] };

/** Several lists and the reader's own filters as one set of filters: two
 *  rules on the same figure become the stricter of the two ("4% or more" and
 *  "3% or more" → "4% or more"; choices keep what both allow). When nothing
 *  can pass both, both stay and nothing passes. */
export function mergeFilters(filters: ScreenerFilter[]): ScreenerFilter[] {
  const out: ScreenerFilter[] = [];
  for (const f of filters) {
    const i = out.findIndex((x) => x.key === f.key);
    if (i < 0) {
      out.push({ ...f });
      continue;
    }
    const a = out[i];
    if (a.in || f.in) {
      const both = (a.in ?? []).filter((v) => (f.in ?? []).includes(v));
      if (both.length) out[i] = { key: a.key, in: both };
      else out.push({ ...f });
      continue;
    }
    const lo = a.min == null ? f.min : f.min == null ? a.min : Math.max(a.min, f.min);
    const hi = a.max == null ? f.max : f.max == null ? a.max : Math.min(a.max, f.max);
    out[i] = { key: a.key, ...(lo != null ? { min: lo } : {}), ...(hi != null ? { max: hi } : {}) };
  }
  return out;
}

/** A saved screen that is one of the lists (+ quick narrowing): it reopens as
 *  that list, not as a pile of filters. */
export function matchGoal(
  spec: ScreenerSpec,
  goals: ScreenerReady[],
): { goal: ScreenerReady; refine: ScreenerFilter[]; safe: boolean } | null {
  const { filters, safe } = stripSafety(spec.filters);
  for (const g of goals) {
    if (!g.spec.filters.every((f) => filters.some((x) => sameFilter(f, x)))) continue;
    const rest = filters.filter((x) => !g.spec.filters.some((f) => sameFilter(f, x)));
    const ok = rest.every((x) => (REFINE_KEYS as readonly string[]).includes(x.key)
      && (x.key !== "category" || sameFilter(x, A_ONLY)));
    if (ok) return { goal: g, refine: rest, safe };
  }
  return null;
}
