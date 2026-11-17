/**
 * Compare stocks (`/compare-stocks`) — the payload of `GET /api/compare?codes=`
 * (backend services/compare.py + compare_service.py; keep the two in step) and
 * the page's constants.
 *
 * Every share is a row, never a column: each card asks one question and
 * sorts the shares best first on one figure (2026-11-12, the column-per-share
 * mockup read as "complex, messy and hard to understand"). Each share keeps a
 * number (its place in the URL) beside its name in every card, so a reader
 * can follow it as the order changes from card to card (2026-11-18).
 */
export const COMPARE_PATH = "/compare-stocks";
export const COMPARE_ANCHOR = "cmp-premium";
/** A free reader puts this many shares side by side (= lib/premium.ts
 *  `FREE_LIMITS.compare`, backend `FREE_LIMITS["compare"]`; 3 until 2026-11-18,
 *  user: "make free user can compare at most 2 stocks"); everyone, Premium
 *  included, up to MAX_COMPARE (backend `HARD_LIMITS["compare"]`). Kept here,
 *  not imported from lib/premium.ts, because that file is client-only and the
 *  server page reads these. backend/tests/test_agreement.py checks all four. */
export const FREE_COMPARE = 2;
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

/** Starting points for a reader with nothing chosen yet. Each share carries
 *  its short name in both languages, so a tile names only the shares this
 *  reader will actually compare (a free reader's first FREE_COMPARE). */
export interface Preset {
  codes: string[];
  names: Bi[];
  sector: Bi;
}

export const PRESETS: Preset[] = [
  {
    codes: ["SQURPHARMA", "BEACONPHAR", "RENATA"],
    names: [{ en: "Square", bn: "স্কয়ার" }, { en: "Beacon", bn: "বীকন" }, { en: "Renata", bn: "রেনাটা" }],
    sector: { en: "Medicine", bn: "ওষুধ" },
  },
  {
    codes: ["GP", "ROBI"],
    names: [{ en: "Grameenphone", bn: "গ্রামীণফোন" }, { en: "Robi", bn: "রবি" }],
    sector: { en: "Mobile phone companies", bn: "মোবাইল ফোন কোম্পানি" },
  },
  {
    codes: ["BRACBANK", "CITYBANK", "EBL"],
    names: [{ en: "BRAC Bank", bn: "ব্র্যাক ব্যাংক" }, { en: "City Bank", bn: "সিটি ব্যাংক" }, { en: "EBL", bn: "ইবিএল" }],
    sector: { en: "Banks", bn: "ব্যাংক" },
  },
  {
    codes: ["WALTONHIL", "OLYMPIC", "BATBC"],
    names: [{ en: "Walton", bn: "ওয়ালটন" }, { en: "Olympic", bn: "অলিম্পিক" }, { en: "BAT", bn: "বিএটি" }],
    sector: { en: "Well-known names", bn: "পরিচিত নাম" },
  },
];

/** "Square vs Beacon" / "স্কয়ার আর বীকন" — the shares this reader will compare. */
export function presetLabel(p: Preset, limit: number): Bi {
  const n = p.names.slice(0, Math.max(2, limit));
  return { en: n.map((x) => x.en).join(" vs "), bn: joinBn(n.map((x) => x.bn)) };
}

/** "A, B আর C". */
export function joinBn(names: string[]): string {
  if (names.length < 2) return names.join("");
  return names.slice(0, -1).join(", ") + " আর " + names[names.length - 1];
}

/** "A and B" / "A, B and C". */
export function joinEn(names: string[]): string {
  if (names.length < 2) return names.join("");
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

/** The comparison's own headline: "Square Pharma vs Beacon Pharma" for up
 *  to three shares, "5 shares side by side" past that. */
export function comparisonTitle(names: string[]): Bi {
  if (names.length > 3) return { en: `${names.length} shares side by side`, bn: `${names.length}টি শেয়ার পাশাপাশি` };
  return { en: names.join(" vs "), bn: names.join(" বনাম ") };
}

/**
 * The seven questions in three parts (2026-11-18): one heading each, so the
 * page reads as the company, then its price, then what it pays and when —
 * and on a computer the two columns fill 4 + 2 + 2 (the dividend card is
 * joined by the dates card) instead of leaving the seventh card alone.
 */
export const PARTS: { key: "company" | "price" | "cash"; title: Bi; lead: Bi; qs: CompareQuestion["key"][] }[] = [
  {
    key: "company",
    title: { en: "The company", bn: "কোম্পানি" },
    lead: { en: "How strong each business is, and how it is doing.", bn: "প্রতিটি ব্যবসা কতটা শক্তিশালী, আর কেমন চলছে।" },
    qs: ["grade", "profit", "loans", "size"],
  },
  {
    key: "price",
    title: { en: "The price", bn: "দাম" },
    lead: { en: "What you pay for each company today, and how its price has moved.", bn: "আজ প্রতিটি কোম্পানির জন্য কত দাম দিচ্ছেন, আর দাম কেমন বদলেছে।" },
    qs: ["pe", "move"],
  },
  {
    key: "cash",
    title: { en: "Dividends and dates", bn: "ডিভিডেন্ড আর তারিখ" },
    lead: { en: "What they pay you in cash, and the dates coming up.", bn: "এগুলো নগদে কত দেয়, আর সামনের তারিখগুলো।" },
    qs: ["dividend"],
  },
];

/** The questions in a few words, for the empty page's "What you'll see". */
export const QUESTION_WORDS: Record<CompareQuestion["key"], Bi> = {
  grade: { en: "Which is the strongest company", bn: "কোন কোম্পানি সবচেয়ে শক্তিশালী" },
  profit: { en: "Whose profit grew more", bn: "কার মুনাফা বেশি বেড়েছে" },
  loans: { en: "Which has fewer loans", bn: "কোনটির ঋণ কম" },
  size: { en: "Which is bigger", bn: "কোনটি বড়" },
  pe: { en: "Which costs less for its profit", bn: "মুনাফার তুলনায় কোনটির দাম কম" },
  move: { en: "How the price moved this year", bn: "এ বছর দাম কেমন বদলেছে" },
  dividend: { en: "Which pays you more cash", bn: "কোনটি বেশি নগদ দেয়" },
};

/** What a share leads on, in two or three words, for the "Ahead on" line
 *  under each share. Signed questions say "fell least" when every share
 *  fell; a dividend card where nobody paid has no leader. */
export function aheadWord(q: CompareQuestion): Bi | null {
  const top = q.bars.find((b) => b.value != null)?.value ?? null;
  if (top == null || !q.leaders.length) return null;
  switch (q.key) {
    case "grade":
      return { en: "Strongest", bn: "সবচেয়ে শক্তিশালী" };
    case "size":
      return { en: "Biggest", bn: "সবচেয়ে বড়" };
    case "profit":
      return top >= 0 ? { en: "Profit grew most", bn: "মুনাফা বেশি বেড়েছে" } : { en: "Profit fell least", bn: "মুনাফা কম কমেছে" };
    case "dividend":
      return top > 0 ? { en: "Most cash", bn: "বেশি নগদ" } : null;
    case "pe":
      return { en: "Lowest price for its profit", bn: "মুনাফার তুলনায় কম দাম" };
    case "loans":
      return { en: "Fewest loans", bn: "সবচেয়ে কম ঋণ" };
    case "move":
      return top >= 0 ? { en: "Price rose most", bn: "দাম বেশি বেড়েছে" } : { en: "Price fell least", bn: "দাম কম কমেছে" };
    default:
      return null;
  }
}

/** Every share's "Ahead on" words, in question order: {code: [{key, word}]}. */
export function aheadOn(questions: CompareQuestion[]): Record<string, { key: CompareQuestion["key"]; word: Bi }[]> {
  const out: Record<string, { key: CompareQuestion["key"]; word: Bi }[]> = {};
  const order = PARTS.flatMap((p) => p.qs);
  const sorted = [...questions].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  for (const q of sorted) {
    const word = aheadWord(q);
    if (!word) continue;
    for (const c of q.leaders) (out[c] ??= []).push({ key: q.key, word });
  }
  return out;
}

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
