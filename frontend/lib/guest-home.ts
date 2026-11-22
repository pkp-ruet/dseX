import type {
  LatestResults,
  MarketStateData,
  ScoreItem,
} from "@/lib/api";
import type { BuyList } from "@/lib/buy-list";
import type { RiskRegister } from "@/lib/research-reports";
import { SAMPLE_PORTFOLIOS } from "@/lib/sample-portfolios";
import { SHOWCASE } from "@/lib/premium-line";
import { daysFrom, whenWord } from "@/lib/home-dates";
import { dayShort } from "@/components/dividend-calendar/dates";
import { getTier, TIER_LABELS, TIER_LABELS_BN } from "@/lib/constants";
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

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

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

export type TodayIcon = "buylist" | "rank" | "results" | "calendar";

export interface TodayRow {
  key: string;
  href: string;
  icon: TodayIcon;
  premiumPage: boolean;
  title: Bi;
  fresh: number;
  caption: Bi;
  value: string;
  unit: Bi;
}

function names(codes: string[], total: number): string {
  const shown = codes.slice(0, 3).join(", ");
  return total > 3 ? `${shown} +${total - 3}` : shown;
}

export function todayRows(
  todayIso: string,
  buyList: BuyList | null,
  ranked: ScoreItem[],
  results: LatestResults | null,
  market: MarketStateData | null,
): TodayRow[] {
  const out: TodayRow[] = [];

  if (buyList) {
    const n = buyList.count;
    const free = buyList.free_pick;
    out.push({
      key: "buylist",
      href: "/buy-list",
      icon: "buylist",
      premiumPage: true,
      title: { en: "Today's Buy List", bn: "আজকের কেনার তালিকা" },
      fresh: buyList.changes?.week_joined?.length ?? 0,
      caption: free
        ? { en: `${free} is free today · the rest with Premium`, bn: `আজ ফ্রি: ${free} · বাকিগুলো প্রিমিয়ামে` }
        : { en: "The few shares we would buy today", bn: "আজ আমরা যে কয়টি শেয়ার কিনতাম" },
      value: String(n),
      unit: { en: plural(n, "share", "shares"), bn: "শেয়ার" },
    });
  }

  if (ranked.length) {
    const top = ranked.slice(0, 3).map((s) => s.trading_code);
    out.push({
      key: "ranking",
      href: "/dsestockranking",
      icon: "rank",
      premiumPage: false,
      title: { en: "Strongest companies", bn: "সবচেয়ে শক্তিশালী কোম্পানি" },
      fresh: 0,
      caption: { en: `Top: ${top.join(", ")}`, bn: `শীর্ষে: ${top.join(", ")}` },
      value: String(ranked.length),
      unit: { en: "ranked", bn: "র‍্যাঙ্ক করা" },
    });
  }

  const week = (results?.results ?? []).filter((r) => {
    const d = daysFrom(r.post_date.slice(0, 10), todayIso);
    return d >= 0 && d <= 6;
  });
  if (week.length) {
    const better = week.filter((r) => r.level === "good").length;
    const weaker = week.filter((r) => r.level === "bad").length;
    const latest = week.map((r) => r.code);
    out.push({
      key: "results",
      href: "/results",
      icon: "results",
      premiumPage: false,
      title: { en: "Results this week", bn: "এ সপ্তাহের আর্থিক ফল" },
      fresh: 0,
      caption: {
        en: `Latest: ${names(latest, latest.length)} · ${better} better, ${weaker} weaker`,
        bn: `সর্বশেষ: ${names(latest, latest.length)} · ${better}টি ভালো, ${weaker}টি দুর্বল`,
      },
      value: String(week.length),
      unit: { en: plural(week.length, "report", "reports"), bn: "রিপোর্ট" },
    });
  }

  // The calendar's free week (THE Premium line, step 2): last days to buy in
  // the next 7 days are open to everyone.
  const soon = nextCashRecord(market).filter((d) => (d.buy_days_left ?? 99) <= 7);
  if (soon.length) {
    const first = soon[0];
    const companies = new Set(soon.map((d) => d.trading_code)).size;
    const day = dayShort(first.buy_by);
    out.push({
      key: "dividends",
      href: "/dividend-calendar#this-week",
      icon: "calendar",
      premiumPage: false,
      title: { en: "Dividends this week", bn: "এ সপ্তাহের ডিভিডেন্ড" },
      fresh: 0,
      caption: {
        en: `Next last day to buy: ${first.trading_code}, ${day.en}`,
        bn: `পরের কেনার শেষ দিন: ${first.trading_code}, ${day.bn}`,
      },
      value: String(companies),
      unit: { en: plural(companies, "company", "companies"), bn: "কোম্পানি" },
    });
  }
  return out;
}

// --------------------------------------------------------- 5 · the slides

/** One of the five companies whose full analysis is open to everyone. */
export interface ShowcasePick {
  code: string;
  name: string;
  group: Bi;
}

export function showcasePick(byCode: Map<string, ScoreItem>): ShowcasePick | null {
  for (const code of SHOWCASE) {
    const s = byCode.get(code);
    if (!s || s.score == null) continue;
    const tier = getTier(s.score);
    return {
      code,
      name: shortCompany(s.company_name, code),
      group: { en: TIER_LABELS[tier], bn: TIER_LABELS_BN[tier] },
    };
  }
  return null;
}

/** Shown under the examples so a guest knows the rows are not theirs. */
export const EXAMPLE_TAG: Bi = { en: "Example", bn: "উদাহরণ" };

export function guestWhen(market: MarketStateData | null, todayIso: string): "today" | "last" {
  return market?.date && market.date.slice(0, 10) === todayIso ? "today" : "last";
}
