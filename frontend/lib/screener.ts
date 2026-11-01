import type {
  ScreenerFilter, ScreenerFilterDef, ScreenerReady, ScreenerSpec, ScreenerUniverse, ScreenerUnit,
} from "@/lib/api";

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

/** How many rows pass `filters` with the filter on `key` replaced by `f`
 *  (or taken off when `f` is null) — the count beside every choice. */
export function countWith(rows: ScreenerRow[], filters: ScreenerFilter[], key: string, f: ScreenerFilter | null): number {
  const others = filters.filter((x) => x.key !== key);
  const all = f ? [...others, f] : others;
  let n = 0;
  for (const r of rows) if (matches(r.v, all)) n++;
  return n;
}

/** The middle half of the market on one figure: where most DSE shares sit. */
export function typical(rows: ScreenerRow[], key: string): { lo: number; mid: number; hi: number; n: number } | null {
  const xs = rows.map((r) => r.v[key]).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  if (xs.length < 10) return null;
  const at = (q: number) => xs[Math.min(xs.length - 1, Math.max(0, Math.round(q * (xs.length - 1))))];
  return { lo: at(0.25), mid: at(0.5), hi: at(0.75), n: xs.length };
}

/** Bars for the filter sheet: counts in `bins` equal steps between the 2nd
 *  and 98th percentile (one giant listing would squash the rest). */
export function histogram(rows: ScreenerRow[], key: string, bins = 24): { lo: number; hi: number; counts: number[] } | null {
  const xs = rows.map((r) => r.v[key]).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  if (xs.length < 10) return null;
  const lo = xs[Math.floor(0.02 * (xs.length - 1))];
  const hi = xs[Math.ceil(0.98 * (xs.length - 1))];
  if (!(hi > lo)) return null;
  const counts = new Array(bins).fill(0);
  for (const x of xs) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor(((x - lo) / (hi - lo)) * bins)));
    counts[i]++;
  }
  return { lo, hi, counts };
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

/** The columns a result table shows beside price and today's change: the
 *  order's figure, then the figures the screen filters on, then P/E, yield
 *  and size until there are `want`; at most 5 (the table shows fewer on
 *  narrower screens, so the first ones matter most). */
export function tableColumns(spec: ScreenerSpec, defs: Map<string, ScreenerFilterDef>, want = 4): string[] {
  const out: string[] = [];
  const add = (k: string) => {
    const d = defs.get(k);
    if (d && d.kind === "range" && k !== "price" && k !== "change" && !out.includes(k)) out.push(k);
  };
  if (spec.sort !== "name") add(spec.sort);
  spec.filters.forEach((f) => add(f.key));
  for (const k of ["pe", "yield", "mcap", "turnover"]) {
    if (out.length >= want) break;
    add(k);
  }
  return out.slice(0, 5);
}
