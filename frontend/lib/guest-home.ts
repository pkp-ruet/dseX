import type {
  LatestResults,
  MarketStateData,
  ScoreItem,
} from "@/lib/api";
import type { RiskRegister } from "@/lib/research-reports";
import { SAMPLE_PORTFOLIOS } from "@/lib/sample-portfolios";
import { whenWord } from "@/lib/home-dates";
import { money } from "@/lib/formatters";

/**
 * The guest home (2026-11-23, user: the signed-out landing "doesn't tell much
 * about what user will get after sign in … mostly a promotional page", then
 * "redo the mockup in the blended form" → "Yes, build it"; mockup
 * https://claude.ai/artifact/2rXAyT319sXtJXWBjE6rMG, version 2).
 *
 * A guest lands on the signed-in home's own layout. Public blocks show today's
 * data; the personal blocks show a labelled example built from today's real
 * market. Everything here is pure and serializable, built on the server in
 * both languages from the requests `app/page.tsx` already makes.
 */

export interface Bi {
  en: string;
  bn: string;
}

/** "Square Pharmaceuticals PLC." → "Square Pharmaceuticals". */
export function shortCompany(name: string | null | undefined, code: string): string {
  const n = (name ?? "").replace(/\s+(Limited|Ltd\.?|PLC\.?|Company)\s*$/i, "").trim();
  return n || code;
}

// ---------------------------------------------------------------- the band

/** The example portfolio in the band's money spot: the well-spread sample
 *  (the same one /sample-portfolio/diversified shows) at today's prices. No
 *  profit since bought: the sample's buy prices are made up. */
export interface GuestMoney {
  value: number;
  /** Taka move on the last trading day. */
  delta: number | null;
  shares: number;
  grade: string | null;
}

export function sampleMoney(byCode: Map<string, ScoreItem>, grade: string | null): GuestMoney | null {
  const holdings = SAMPLE_PORTFOLIOS.diversified.holdings;
  let value = 0;
  let delta = 0;
  let known = 0;
  for (const h of holdings) {
    const s = byCode.get(h.trading_code);
    if (!s || s.ltp == null) return null; // a sample missing a price would lie about itself
    value += h.qty * s.ltp;
    if (s.change_pct != null) {
      // Yesterday's close from today's and the change.
      delta += h.qty * (s.ltp - s.ltp / (1 + s.change_pct / 100));
      known += 1;
    }
  }
  return { value, delta: known ? delta : null, shares: holdings.length, grade };
}

// ------------------------------------------------------- 4 · on your shares

export type ExampleTone = "good" | "watch" | "bad";

export interface ExampleRow {
  key: string;
  kind: Bi;
  tone: ExampleTone;
  code: string;
  name: string;
  text: Bi;
  when: Bi;
  href: string;
}

function nextCashRecord(market: MarketStateData | null) {
  return (market?.next?.dividends ?? [])
    .filter((d) => d.kind === "record" && (d.cash_per_share ?? 0) > 0 && d.buy_by && (d.buy_days_left ?? -1) >= 0)
    .sort((a, b) => (a.buy_by ?? "").localeCompare(b.buy_by ?? ""));
}

/**
 * Three real things from today, as they would read on a reader's own shares:
 * a better result, a last day to buy before a dividend, and a serious problem
 * a company picked up this week (else a weaker result). Each is already
 * public on its own page.
 */
export function exampleRows(
  todayIso: string,
  results: LatestResults | null,
  market: MarketStateData | null,
  risks: RiskRegister | null,
): ExampleRow[] {
  const out: ExampleRow[] = [];
  const rows = results?.results ?? [];

  const good = rows.find((r) => r.level === "good");
  if (good) {
    out.push({
      key: `res-${good.code}`,
      kind: { en: "Results", bn: "আর্থিক ফল" },
      tone: "good",
      code: good.code,
      name: shortCompany(good.name, good.code),
      text: { en: good.headline_en, bn: good.headline_bn || good.headline_en },
      when: whenWord(todayIso, good.post_date.slice(0, 10)),
      href: `/stock/${encodeURIComponent(good.code)}#results`,
    });
  }

  const div = nextCashRecord(market)[0];
  if (div && div.buy_by && div.cash_per_share != null) {
    const name = shortCompany(div.company_name, div.trading_code);
    const cash = money(div.cash_per_share);
    out.push({
      key: `div-${div.trading_code}`,
      kind: { en: "Last day to buy", bn: "কেনার শেষ দিন" },
      tone: "watch",
      code: div.trading_code,
      name,
      text: {
        en: `Buy by this day to get its ${cash} a share cash dividend.`,
        bn: `শেয়ারপ্রতি ${cash} নগদ ডিভিডেন্ড পেতে এই দিনের মধ্যে কিনতে হবে।`,
      },
      when: whenWord(todayIso, div.buy_by),
      href: `/stock/${encodeURIComponent(div.trading_code)}#dividends`,
    });
  }

  const added = risks?.week?.added?.[0];
  if (added) {
    out.push({
      key: `risk-${added.code}-${added.key}`,
      kind: { en: "Warning", bn: "সতর্কতা" },
      tone: "bad",
      code: added.code,
      name: shortCompany(added.name, added.code),
      text: added.title,
      when: whenWord(todayIso, added.date.slice(0, 10)),
      href: `/stock/${encodeURIComponent(added.code)}#an-safety`,
    });
  } else {
    const bad = rows.find((r) => r.level === "bad");
    if (bad) {
      out.push({
        key: `res-${bad.code}`,
        kind: { en: "Weaker results", bn: "দুর্বল ফল" },
        tone: "bad",
        code: bad.code,
        name: shortCompany(bad.name, bad.code),
        text: { en: bad.headline_en, bn: bad.headline_bn || bad.headline_en },
        when: whenWord(todayIso, bad.post_date.slice(0, 10)),
        href: `/stock/${encodeURIComponent(bad.code)}#results`,
      });
    }
  }
  return out;
}

// --------------------------------------------------- 6 · today on the site

// ------------------------------------------------------------ 3 · your shares

/** "Your shares" for a guest (2026-11-25): the same sample portfolio as the
 *  band's money, at today's prices, most money first. Tagged Example. */
export interface ExampleShare {
  code: string;
  name: string;
  qty: number;
  value: number;
  change: number | null;
}

export function sampleShares(byCode: Map<string, ScoreItem>, limit = 5): ExampleShare[] {
  const out: ExampleShare[] = [];
  for (const h of SAMPLE_PORTFOLIOS.diversified.holdings) {
    const s = byCode.get(h.trading_code);
    if (!s || s.ltp == null) return []; // a sample missing a price would lie about itself
    out.push({
      code: h.trading_code,
      name: shortCompany(s.company_name, h.trading_code),
      qty: h.qty,
      value: h.qty * s.ltp,
      change: s.change_pct ?? null,
    });
  }
  return out.sort((a, b) => b.value - a.value).slice(0, limit);
}

export const EXAMPLE_TAG: Bi = { en: "Example", bn: "উদাহরণ" };

export function guestWhen(market: MarketStateData | null, todayIso: string): "today" | "last" {
  return market?.date && market.date.slice(0, 10) === todayIso ? "today" : "last";
}
