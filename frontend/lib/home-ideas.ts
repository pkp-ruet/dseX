import type { RecommendedStock, DailyTip, ScoreItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import type { CopyKey } from "@/lib/home-copy";

/**
 * "3 stocks worth a look today" — one plain list for a reader who has never
 * seen a P/E.
 *
 * The old card showed the same data as three tabs (Picks / Buys / Tips) with
 * "% match", tier pills and signal chips — abstractions a first-time user
 * cannot read. This merges the three sources into ONE ranked list of three
 * rows, each carrying: the company name, one everyday-language reason in the
 * reader's language, a plain "kind" word, and today's price.
 *
 * Order of preference:
 *   1. a stock the reader already follows that is a Buy today (most personal),
 *   2. the personalized daily picks,
 *   3. whole-market Buy signals (strong first),
 *   4. the daily tips.
 * One row per company; the list stops at three.
 */

export type IdeaSource = "follow" | "pick" | "buy" | "tip";

export interface IdeaRow {
  code: string;
  name: string | null;
  source: IdeaSource;
  /** Plain "kind" word — a `home-copy` key so the card can translate it. */
  kind: CopyKey;
  why: string;
  ltp: number | null;
  chg: number | null;
  isNew: boolean;
  href: string;
}

export const IDEA_ROWS = 3;

export const TIP_KIND: Record<string, CopyKey> = {
  dividend_yield: "kindPaysCash",
  dividend_streak: "kindPaysCash",
  div_catalyst: "kindPaysCash",
  profit_growth: "kindGrowing",
  profit_streak: "kindSteady",
  cheap_pe: "kindCheap",
  below_book: "kindCheap",
  near_52w_low: "kindNearLow",
  high_roe: "kindStrong",
  rel_strength: "kindStrong",
};

/** First sentence of a Bengali "এক নজরে" summary (they end in the danda "।"). */
function firstSentenceBn(s: string | undefined): string | null {
  if (!s) return null;
  const i = s.indexOf("।");
  const out = (i > 0 ? s.slice(0, i + 1) : s).trim();
  return out || null;
}

/** What a pick is *about*, from its numbers — for the plain kind word. */
function pickKind(p: RecommendedStock, tuned: boolean): CopyKey {
  if ((p.div_yield_pct ?? 0) >= 4) return "kindPaysCash";
  if ((p.eps_yoy_pct ?? 0) >= 15) return "kindGrowing";
  if ((p.p4_val ?? 0) >= 7) return "kindGoodPrice";
  if ((p.score ?? 0) >= 75) return "kindStrong";
  return tuned ? "kindMatched" : "kindStrong";
}

function tipSummary(tip: DailyTip): string {
  const t = tip.text || "";
  const i = t.indexOf(" — ");
  return i >= 0 ? t.slice(i + 3) : t;
}

export function buildIdeas(opts: {
  picks: RecommendedStock[];
  buys: ScoreItem[];
  tips: DailyTip[];
  /** Holdings ∪ watchlist codes. */
  followed: string[];
  tuned: boolean;
  newPickCodes: string[];
  newBuyCodes: Set<string>;
  /** Cached Bengali one-liners keyed by code — the Bengali "why" for picks
   *  that were cached before `reasons_bn` existed. */
  summariesBn: Record<string, string>;
  lang: Lang;
  max?: number;
}): IdeaRow[] {
  const { picks, buys, tips, tuned, newPickCodes, newBuyCodes, summariesBn, lang } = opts;
  const bn = lang === "bn";
  const max = opts.max ?? IDEA_ROWS;
  const followed = new Set(opts.followed.map((c) => c.toUpperCase()));
  const newPicks = new Set(newPickCodes.map((c) => c.toUpperCase()));
  const out: IdeaRow[] = [];
  const taken = new Set<string>();

  const push = (row: IdeaRow) => {
    const code = row.code.toUpperCase();
    if (taken.has(code) || out.length >= max) return;
    taken.add(code);
    out.push({ ...row, code });
  };

  const buyWhy = (s: ScoreItem): string =>
    (bn ? s.signal?.reason_bn : s.signal?.reason_en) ||
    s.signal?.reason_en ||
    (bn ? firstSentenceBn(summariesBn[s.trading_code.toUpperCase()]) : null) ||
    s.company_name ||
    "";

  // 1 — a Buy on something the reader follows
  const strongFirst = [...buys].sort(
    (a, b) =>
      Number(b.signal?.strength === "strong") - Number(a.signal?.strength === "strong") ||
      (b.score ?? -1) - (a.score ?? -1),
  );
  for (const s of strongFirst) {
    if (!followed.has(s.trading_code.toUpperCase())) continue;
    push({
      code: s.trading_code,
      name: s.company_name ?? null,
      source: "follow",
      kind: "kindYouFollow",
      why: buyWhy(s),
      ltp: s.ltp ?? null,
      chg: s.change_pct ?? null,
      isNew: newBuyCodes.has(s.trading_code.toUpperCase()),
      href: `/stock/${s.trading_code}`,
    });
    if (out.length >= max) return out;
  }

  // 2 — personalized picks
  for (const p of picks) {
    const code = p.trading_code.toUpperCase();
    const whyEn = p.reasons?.[0] || p.company_name || "";
    const whyBn = p.reasons_bn?.[0] || firstSentenceBn(summariesBn[code]) || whyEn;
    push({
      code: p.trading_code,
      name: p.company_name ?? null,
      source: "pick",
      kind: pickKind(p, tuned),
      why: bn ? whyBn : whyEn,
      ltp: p.ltp ?? null,
      chg: p.change_pct ?? null,
      isNew: newPicks.has(code),
      href: `/stock/${p.trading_code}`,
    });
    if (out.length >= max) return out;
  }

  // 3 — whole-market buys
  for (const s of strongFirst) {
    push({
      code: s.trading_code,
      name: s.company_name ?? null,
      source: "buy",
      kind: s.signal?.strength === "strong" ? "kindStrongBuy" : "kindGoodPrice",
      why: buyWhy(s),
      ltp: s.ltp ?? null,
      chg: s.change_pct ?? null,
      isNew: newBuyCodes.has(s.trading_code.toUpperCase()),
      href: `/stock/${s.trading_code}`,
    });
    if (out.length >= max) return out;
  }

  // 4 — tips
  for (const tip of tips) {
    const code = tip.trading_code.toUpperCase();
    const whyEn = tipSummary(tip) || tip.why || "";
    const whyBn = tip.why_bn || firstSentenceBn(summariesBn[code]) || whyEn;
    push({
      code: tip.trading_code,
      name: tip.company_name ?? null,
      source: "tip",
      kind: TIP_KIND[tip.category] ?? "kindTip",
      why: bn ? whyBn : whyEn,
      ltp: tip.ltp ?? null,
      chg: null,
      isNew: false,
      href: `/stock/${tip.trading_code}`,
    });
    if (out.length >= max) return out;
  }

  return out;
}
