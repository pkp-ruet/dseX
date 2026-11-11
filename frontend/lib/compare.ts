/**
 * Compare stocks (`/compare-stocks`) — the payload of `GET /api/compare?codes=`
 * (backend services/compare.py + compare_service.py; keep the two in step) and
 * the page's constants.
 *
 * Every share is a row, never a column: each card asks one question and
 * sorts the shares best first on one figure (2026-11-12, the column-per-share
 * mockup read as "complex, messy and hard to understand").
 */
export const COMPARE_PATH = "/compare-stocks";
export const COMPARE_ANCHOR = "cmp-premium";
/** A free reader puts this many shares side by side (= lib/premium.ts
 *  `FREE_LIMITS.compare`, backend `FREE_LIMITS["compare"]`); everyone, Premium
 *  included, up to MAX_COMPARE (backend `HARD_LIMITS["compare"]`). Kept here,
 *  not imported from lib/premium.ts, because that file is client-only and the
 *  server page reads these. backend/tests/test_agreement.py checks all four. */
export const FREE_COMPARE = 3;
export const MAX_COMPARE = 10;

export type Bi = { en: string; bn: string };
export type Tone = "good" | "fair" | "bad" | "neutral";

export interface CompareShare {
  code: string;
  name: string;
  short: string;
  sector: string | null;
  sector_bn: string | null;
  category: string | null;
  price: number | null;
  change_pct: number | null;
  score: number | null;
  tier: string;
  group: Bi;
  rank: number | null;
  total: number | null;
  /** Our read of the company (Premium on screen; the API sends it to everyone). */
  analysis: {
    checks: Record<string, "strong" | "fair" | "weak">;
    strong: Bi | null;
    fair: Bi | null;
    weak: Bi | null;
    price: (Bi & { tone: Tone }) | null;
    safety: { word: Bi; tone: Tone; line: Bi | null } | null;
  };
}

export interface CompareBar {
  code: string;
  value: number | null;
  label: Bi;
  sub: Bi | null;
  /** "pos" / "neg" for a signed figure, else "". */
  tone: string;
}

export interface CompareQuestion {
  key: "grade" | "size" | "profit" | "dividend" | "pe" | "loans" | "move";
  topic: Bi;
  question: Bi;
  best: "max" | "min";
  /** Bars around zero (the price move): green right, red left. */
  diverge: boolean;
  glance: Bi | null;
  bars: CompareBar[];
  leaders: string[];
  answer: Bi;
  meaning: Bi;
  more: { cols: Bi[]; rows: { code: string; cells: Bi[] }[] };
}

export interface CompareDate {
  date: string;
  code: string;
  kind: "record" | "agm" | "results";
  label: Bi;
  line: Bi;
}

export interface ComparePayload {
  as_of: string | null;
  codes: string[];
  missing: string[];
  max: number;
  free_max: number;
  shares: CompareShare[];
  questions: CompareQuestion[];
  plain: Bi | null;
  dates: CompareDate[];
  similar: { code: string; short: string }[];
}

/** One company the picker can offer (the server page passes every scored one). */
export interface PickOption {
  code: string;
  name: string;
  sector: string | null;
}

/** Starting points for a reader with nothing chosen yet. */
export const PRESETS: { codes: string[]; en: string; bn: string }[] = [
  { codes: ["SQURPHARMA", "BEACONPHAR", "RENATA"], en: "Square vs Beacon vs Renata", bn: "স্কয়ার, বীকন আর রেনাটা" },
  { codes: ["GP", "ROBI"], en: "Grameenphone vs Robi", bn: "গ্রামীণফোন আর রবি" },
  { codes: ["BRACBANK", "CITYBANK", "EBL"], en: "BRAC Bank vs City Bank vs EBL", bn: "ব্র্যাক ব্যাংক, সিটি ব্যাংক আর ইবিএল" },
  { codes: ["WALTONHIL", "OLYMPIC", "BATBC"], en: "Walton vs Olympic vs BAT", bn: "ওয়ালটন, অলিম্পিক আর বিএটি" },
];

const SUFFIXES = [" limited", " ltd.", " ltd", " plc.", " plc", " company", " co."];

/** "Square Pharmaceuticals PLC." → "Square Pharmaceuticals" — the backend's
 *  `weekly_letter.short_name`, so the picker's names match the comparison's. */
export function shortName(name: string | null | undefined, code: string): string {
  let n = (name ?? "").split(/\s+/).filter(Boolean).join(" ");
  if (!n) return code;
  let changed = true;
  while (changed) {
    changed = false;
    for (const suf of SUFFIXES) {
      if (n.toLowerCase().endsWith(suf) && n.length > suf.length + 2) {
        n = n.slice(0, -suf.length).replace(/[ ,.]+$/, "");
        changed = true;
      }
    }
  }
  if (n.toLowerCase().startsWith("the ")) n = n.slice(4);
  return n || code;
}

export function compareHref(codes: string[]): string {
  return codes.length ? `${COMPARE_PATH}?s=${codes.join(",")}` : COMPARE_PATH;
}

/** "gp,robi" → ["GP", "ROBI"]: upper case, no repeats, URL order. */
export function parseCodes(raw: string | null | undefined): string[] {
  const out: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    const c = part.trim().toUpperCase();
    if (c && /^[A-Z0-9&.-]{1,20}$/.test(c) && !out.includes(c)) out.push(c);
  }
  return out.slice(0, MAX_COMPARE);
}
