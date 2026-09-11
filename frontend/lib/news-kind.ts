/**
 * Cheap keyword classification of a DSE news headline so a list of announcements
 * can wear a one-word chip. Title-only on purpose — bodies are long and noisy.
 * Order matters: the first matching rule wins.
 */

export type NewsKindKey = "dividend" | "agm" | "earnings" | "sensitive" | "board" | "record" | "trading" | "other";

export interface NewsKind {
  key: NewsKindKey;
  label: string;
  labelBn: string;
  /** CSS colour token for the chip. */
  color: string;
}

const KINDS: Record<NewsKindKey, NewsKind> = {
  dividend:  { key: "dividend",  label: "Dividend",        labelBn: "লভ্যাংশ",         color: "var(--positive)" },
  earnings:  { key: "earnings",  label: "Results",         labelBn: "ফলাফল",           color: "var(--info)" },
  agm:       { key: "agm",       label: "AGM",             labelBn: "বার্ষিক সভা",      color: "var(--navy-soft)" },
  record:    { key: "record",    label: "Record date",     labelBn: "রেকর্ড ডেট",       color: "var(--warm)" },
  sensitive: { key: "sensitive", label: "Price sensitive", labelBn: "দাম-সংবেদনশীল",  color: "var(--negative)" },
  board:     { key: "board",     label: "Board meeting",   labelBn: "বোর্ড মিটিং",      color: "var(--text-muted)" },
  trading:   { key: "trading",   label: "Trading",         labelBn: "লেনদেন",          color: "var(--text-muted)" },
  other:     { key: "other",     label: "Notice",          labelBn: "বিজ্ঞপ্তি",         color: "var(--text-muted)" },
};

const RULES: [NewsKindKey, RegExp][] = [
  ["dividend",  /dividend|bonus share|cash div|stock div|interim div/i],
  ["earnings",  /\b(q[1-4]|quarter|half[- ]yearly|un-?audited|audited|financial statement|eps|nav per share|net profit|results?)\b/i],
  ["agm",       /\b(agm|egm|annual general meeting|extra-?ordinary general meeting)\b/i],
  ["record",    /record date/i],
  ["sensitive", /price sensitive|psi\b|credit rating|right share|rights issue|ipo|merger|acquisition|capital rais|placement/i],
  ["board",     /board meeting|board of directors|bod\b/i],
  ["trading",   /trading (?:suspension|resum|halt)|spot market|circuit|category/i],
];

export function classifyNews(title: string | null | undefined): NewsKind {
  const t = (title || "").trim();
  if (!t) return KINDS.other;
  for (const [key, re] of RULES) {
    if (re.test(t)) return KINDS[key];
  }
  return KINDS.other;
}
