/**
 * Entity extraction for the rule-based parser — pulls a ticker, sector, price
 * cap, and screening goal out of free text. No NLP; just careful matching.
 */
import type { CompanyRef, Entities, MetricGoal } from "./types";
import {
  METRIC_WORDS,
  SECTOR_ALIASES,
  SECTOR_CONTEXT_WORDS,
} from "./synonyms";

/** Words that are never a stock name — skipped when guessing a ticker. */
const STOP = new Set([
  "is", "a", "an", "the", "good", "bad", "buy", "sell", "should", "i", "you", "we",
  "tell", "me", "about", "show", "give", "stock", "stocks", "share", "shares", "price",
  "of", "for", "what", "whats", "how", "hows", "s", "dividend", "dividends", "pe",
  "ratio", "yield", "analysis", "info", "information", "cheap", "expensive", "value",
  "and", "or", "to", "in", "on", "do", "does", "this", "that", "are", "any", "best",
  "top", "high", "low", "with", "under", "below", "over", "above", "now", "today",
  "market", "worth", "invest", "investment", "company", "companies", "vs", "than",
]);

/**
 * Resolve a ticker from the message. Strategy:
 *  1. Exact trading-code token (strongest).
 *  2. Token scoring against codes + company-name words; the single best wins,
 *     a tie returns up to 5 candidates for a "did you mean".
 */
export function extractTicker(
  raw: string,
  index: CompanyRef[],
): { code?: string; candidates?: CompanyRef[] } {
  const tokens = raw.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!tokens.length || !index.length) return {};

  const byLowerCode = new Map(index.map((c) => [c.trading_code.toLowerCase(), c]));

  // 1) exact code token
  for (const t of tokens) {
    const hit = byLowerCode.get(t);
    if (hit) return { code: hit.trading_code };
  }

  // 2) score by meaningful tokens against code prefix + name word-starts
  const meaningful = tokens.filter((t) => t.length >= 3 && !STOP.has(t));
  if (!meaningful.length) return {};

  let best = 0;
  const scored = new Map<string, { ref: CompanyRef; n: number }>();
  for (const c of index) {
    const code = c.trading_code.toLowerCase();
    const words = (c.company_name ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    let n = 0;
    for (const t of meaningful) {
      if (code === t || code.startsWith(t) || words.some((w) => w.startsWith(t))) n++;
    }
    if (n > 0) {
      scored.set(c.trading_code, { ref: c, n });
      if (n > best) best = n;
    }
  }
  if (!scored.size) return {};

  const top = [...scored.values()].filter((x) => x.n === best).map((x) => x.ref);
  if (top.length === 1) return { code: top[0].trading_code };
  if (top.length <= 5) return { candidates: top };
  return {}; // too broad to guess
}

/** Find a sector mention, honoring needsContext for short aliases like "it". */
export function extractSector(norm: string): { sector: string; sectorMatch: string } | null {
  const hasContext = SECTOR_CONTEXT_WORDS.some((w) => wordIn(norm, w));
  for (const def of SECTOR_ALIASES) {
    for (const alias of def.aliases) {
      if (!wordIn(norm, alias)) continue;
      if (def.needsContext && !hasContext) continue;
      return { sector: def.label, sectorMatch: def.match };
    }
  }
  return null;
}

/** "under 50", "below ৳120", "less than 200" → 50 / 120 / 200. */
export function extractPriceCap(norm: string): number | undefined {
  const m = norm.match(/(?:under|below|less than|max|upto|up to|cheaper than)\s*(?:tk|৳|taka|bdt)?\s*(\d{1,5})/);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

/** First screening goal whose vocabulary appears in the text. */
export function extractMetricGoal(norm: string): MetricGoal | undefined {
  const order: MetricGoal[] = ["dividend", "growth", "momentum", "cheap", "safe"];
  for (const goal of order) {
    if (METRIC_WORDS[goal].some((w) => phraseIn(norm, w))) return goal;
  }
  return undefined;
}

export function buildEntities(raw: string, norm: string, index: CompanyRef[]): Entities {
  const ent: Entities = {};
  const tick = extractTicker(raw, index);
  if (tick.code) ent.code = tick.code;
  if (tick.candidates) ent.candidates = tick.candidates;
  const sec = extractSector(norm);
  if (sec) {
    ent.sector = sec.sector;
    ent.sectorMatch = sec.sectorMatch;
  }
  const cap = extractPriceCap(norm);
  if (cap != null) ent.priceCap = cap;
  const metric = extractMetricGoal(norm);
  if (metric) ent.metric = metric;
  return ent;
}

// --- helpers ---

/** Whole-word match (so "it" doesn't match "with"). */
export function wordIn(norm: string, word: string): boolean {
  if (word.includes(" ")) return norm.includes(word);
  return new RegExp(`(^|[^a-z0-9])${escapeRe(word)}([^a-z0-9]|$)`).test(norm);
}

/** Word match for single words; substring for multi-word phrases. */
function phraseIn(norm: string, w: string): boolean {
  return w.includes(" ") ? norm.includes(w) : wordIn(norm, w);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lower-case, collapse whitespace, drop most punctuation (keep ৳ and digits). */
export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}৳\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
