"use client";

import { useState, type ComponentType } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import {
  forYouCounts,
  type CorporateActionEvent,
  type ForYou,
  type HomeBundle,
  type LatestResultRow,
  type PortfolioHolding,
  type UpcomingResult,
} from "@/lib/api";
import type { BuyListHome } from "@/lib/buy-list";
import { bdGroup } from "@/lib/formatters";
import { useMoneyShown } from "@/lib/home-money";
import { dayShort } from "@/components/dividend-calendar/dates";
import { DateTile } from "@/components/dividend-calendar/DateGroup";
import {
  IconChevronDown,
  IconChevronRight,
  IconClipboardCheck,
  IconCalendar,
  IconCoin,
  IconCompass,
  IconCrown,
  IconFileText,
} from "@/components/ui/icons";

type Bi = { en: string; bn: string };

/** "Your dates this week" looks this many days ahead, today included. */
const DATE_DAYS = 7;
/** Dates listed before "+N more". */
const DATE_ROWS = 4;
/** "Dividends coming to you" counts record dates this many days ahead. */
const INCOME_DAYS = 60;
/** Tax taken from a cash dividend (the portfolio's default; 15% without a TIN). */
const DIV_TAX_PCT = 10;

interface DateItem {
  iso: string;
  code: string;
  what: Bi;
  href: string;
}

const RESULTS_WORDS: Record<UpcomingResult["purpose"], Bi> = {
  q1: { en: "First-quarter results meeting", bn: "প্রথম প্রান্তিকের ফলের বোর্ড সভা" },
  q2: { en: "Half-year results meeting", bn: "অর্ধবার্ষিক ফলের বোর্ড সভা" },
  q3: { en: "Third-quarter results meeting", bn: "তৃতীয় প্রান্তিকের ফলের বোর্ড সভা" },
  annual: { en: "Yearly results meeting", bn: "বার্ষিক ফলের বোর্ড সভা" },
};

/** Whole days from `fromIso` to `iso` (both YYYY-MM-DD). */
function daysFrom(fromIso: string, iso: string): number {
  const a = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** `iso` minus `days`, as YYYY-MM-DD. */
function daysBefore(iso: string, days: number): string {
  return new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
}

function taka(v: number): string {
  // Two decimals like the dividend calendar ("৳4.50"), none for a whole taka ("৳6").
  return `৳${v.toFixed(2).replace(/\.00$/, "")}`;
}

/**
 * The dates on the reader's own shares (holdings ∪ watchlist) in the next
 * seven days, soonest first: results meetings (`results_soon`), the last
 * normal-market day to buy before a record date, record dates and AGMs (the
 * calendar rows of their own codes, `dividend_cash`). An AGM shows only while
 * its dividend's record date is still ahead (that is all the bundle carries).
 */
function buildDates(todayIso: string, results: UpcomingResult[], own: CorporateActionEvent[]): DateItem[] {
  const out: DateItem[] = [];
  const inWindow = (iso: string | null | undefined): iso is string => {
    if (!iso) return false;
    const d = daysFrom(todayIso, iso);
    return d >= 0 && d < DATE_DAYS;
  };
  for (const r of results) {
    if (!inWindow(r.date)) continue;
    out.push({
      iso: r.date,
      code: r.code,
      what: RESULTS_WORDS[r.purpose] ?? { en: "Results meeting", bn: "ফলের বোর্ড সভা" },
      href: `/stock/${encodeURIComponent(r.code)}#results`,
    });
  }
  const seen = new Set<string>();
  for (const e of own) {
    const code = e.trading_code;
    const href = `/stock/${encodeURIComponent(code)}#dividends`;
    const cash = e.cash_per_share && e.cash_per_share > 0 ? e.cash_per_share : null;
    const bonus = e.stock_pct && e.stock_pct > 0 ? e.stock_pct : null;
    const add = (iso: string, what: Bi) => {
      const k = `${code}|${iso}|${what.en}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ iso, code, what, href });
    };
    if (inWindow(e.buy_by)) {
      add(
        e.buy_by,
        cash
          ? { en: `Last day to buy for its ${taka(cash)} dividend`, bn: `${taka(cash)} ডিভিডেন্ড পেতে কেনার শেষ দিন` }
          : bonus
            ? { en: "Last day to buy for its bonus shares", bn: "বোনাস শেয়ার পেতে কেনার শেষ দিন" }
            : { en: "Last day to buy before the record date", bn: "রেকর্ড ডেটের আগে কেনার শেষ দিন" },
      );
    }
    if (inWindow(e.record_date)) {
      add(
        e.record_date,
        cash
          ? { en: `Record date, ${taka(cash)} a share`, bn: `রেকর্ড ডেট, শেয়ারপ্রতি ${taka(cash)}` }
          : bonus
            ? { en: `Record date, ${bonus}% bonus shares`, bn: `রেকর্ড ডেট, ${bonus}% বোনাস শেয়ার` }
            : { en: "Record date", bn: "রেকর্ড ডেট" },
      );
    }
    if (inWindow(e.agm_date)) add(e.agm_date, { en: "AGM", bn: "এজিএম" });
  }
  return out.sort((a, b) => (a.iso === b.iso ? a.code.localeCompare(b.code) : a.iso < b.iso ? -1 : 1));
}

/** "Today" · "Tomorrow" · "Wed" / "আজ" · "আগামীকাল" · "বুধ". */
function whenWord(todayIso: string, iso: string): Bi {
  const d = daysFrom(todayIso, iso);
  if (d === 0) return { en: "Today", bn: "আজ" };
  if (d === 1) return { en: "Tomorrow", bn: "আগামীকাল" };
  const s = dayShort(iso);
  return { en: s.en.split(" ")[0], bn: s.bn.split(",")[0] };
}

interface IncomeItem {
  code: string;
  iso: string;
  /** Cash on the shares held today, after tax. */
  cash: number;
}

/**
 * "Dividends coming to you" (round 3, 2026-11-18): cash dividends already
 * declared on the shares the reader owns (main portfolio), whose record date
 * is in the next 60 days — the shares held today × the cash a share, less
 * 10% tax. Bonus shares aren't money, so they don't count. Soonest first.
 */
function buildIncome(todayIso: string, holdings: PortfolioHolding[], own: CorporateActionEvent[]): IncomeItem[] {
  const qty = new Map<string, number>();
  for (const h of holdings) {
    const c = h.trading_code.toUpperCase();
    qty.set(c, (qty.get(c) ?? 0) + (h.qty || 0));
  }
  const seen = new Set<string>();
  const out: IncomeItem[] = [];
  for (const e of own) {
    const code = e.trading_code.toUpperCase();
    const q = qty.get(code) ?? 0;
    const cash = e.cash_per_share ?? 0;
    if (q <= 0 || cash <= 0 || !e.record_date) continue;
    const d = daysFrom(todayIso, e.record_date);
    if (d < 0 || d > INCOME_DAYS) continue;
    const key = `${code}|${e.record_date.slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ code, iso: e.record_date.slice(0, 10), cash: q * cash * (1 - DIV_TAX_PCT / 100) });
  }
  return out.sort((a, b) => (a.iso === b.iso ? a.code.localeCompare(b.code) : a.iso < b.iso ? -1 : 1));
}

/** "24 Nov" / "24 নভেম্বর" (the weekday left out). */
function dayMonth(iso: string): Bi {
  const s = dayShort(iso);
  return { en: s.en.split(" ").slice(1).join(" "), bn: s.bn.split(", ").slice(1).join(", ") || s.bn };
}

/** "SQURPHARMA, EBL, NCCBANK +7". */
function names(codes: string[], total: number, n = 3): string {
  const shown = codes.slice(0, n);
  const rest = total - shown.length;
  return shown.join(", ") + (rest > 0 ? ` +${rest}` : "");
}

/** One summary row. Every row has the same parts, in the same places. */
interface SumRow {
  key: string;
  href: string;
  Icon: ComponentType<{ size?: number }>;
  title: Bi;
  /** A Premium page: a crown on the icon for readers without Premium (as on the icon grid). */
  premiumPage: boolean;
  /** "2 new" beside the title; 0 = none. */
  fresh: number;
  /** The big number on the right, and what it counts ("৳4,073" for money). */
  value: number | string;
  unit: Bi;
  /** One plain line (two at most): the names, or what Premium adds. */
  caption: Bi;
}

/**
 * "Today for you" (2026-11-17, the simple home; tidied the same day, user:
 * "looks messy and unorganized"). Two cards, one shape each:
 *
 * 1. **Your dates this week** — free, only for a reader with shares or a
 *    watchlist: one row per date (the dividend calendar's date tile, the share,
 *    "Wed · Last day to buy for its ৳6 dividend"), each opening that share.
 *    Four rows, then "See all N dates" opens the rest in place (round 2).
 * 2. **Summary rows**, identical parts: icon (crown on a Premium page for a
 *    reader without Premium) · title (+ a gold "N new") · one caption · a big
 *    number with what it counts · chevron. Buy List · Record dates (next two
 *    weeks) · Dividends coming to you (free, round 3, 2026-11-18: cash declared
 *    on the shares they own, record dates in 60 days, after 10% tax — taka
 *    only while the band shows their money, else how many) · Results this
 *    week (free, round 2, 2026-11-18: the reader's own shares named) ·
 *    Discover. A free reader's caption says what is free and that the rest is
 *    Premium, in words; a Premium reader's names the shares.
 *
 * No chips, no lock lines, no sub-lines. From 1024px the two cards sit side by
 * side; without the dates card the rows sit side by side (four: two by two).
 */
export default function TodayForYou({
  lang,
  premium,
  loading,
  buyList,
  recordDates,
  forYou,
  mine,
  todayIso,
  resultsSoon,
  ownDividends,
  resultsWeek,
  ownResults,
  holdings,
}: {
  lang: Lang;
  premium: boolean;
  /** The bundle hasn't arrived yet (and no cached copy). */
  loading: boolean;
  buyList: BuyListHome | null | undefined;
  /** The calendar's record dates inside the next two weeks, market-wide. */
  recordDates: CorporateActionEvent[];
  forYou: ForYou | null | undefined;
  /** The reader's own codes (holdings ∪ watchlist), upper-case. */
  mine: Set<string>;
  /** Today in Dhaka, YYYY-MM-DD. */
  todayIso: string;
  /** Results meetings on the reader's own shares (bundle `results_soon`). */
  resultsSoon: UpcomingResult[];
  /** The calendar's record-date rows for the reader's own codes (bundle `dividend_cash`). */
  ownDividends: CorporateActionEvent[];
  /** The market's week of results (bundle `results_week`). */
  resultsWeek?: HomeBundle["results_week"];
  /** Results on the reader's own shares, last three weeks (bundle `new_results`). */
  ownResults?: LatestResultRow[];
  /** The main portfolio's holdings (null while unknown): Dividends coming to you. */
  holdings?: PortfolioHolding[] | null;
}) {
  const [allDates, setAllDates] = useState(false);
  // The band's eye: taka only once the reader has chosen to see their money.
  const [moneyShown] = useMoneyShown();
  const bn = lang === "bn";
  const pick = (b: Bi) => (bn ? b.bn : b.en);
  const dates = mine.size > 0 && !loading ? buildDates(todayIso, resultsSoon, ownDividends) : null;
  const rows: SumRow[] = [];

  // 1 · Today's Buy List
  if (buyList) {
    const count = buyList.count;
    const free = buyList.free_pick?.code ?? null;
    rows.push({
      key: "buylist",
      href: "/buy-list",
      Icon: IconClipboardCheck,
      title: { en: "Today's Buy List", bn: "আজকের কেনার তালিকা" },
      premiumPage: true,
      fresh: buyList.week_joined,
      value: count,
      unit: { en: count === 1 ? "share" : "shares", bn: "শেয়ার" },
      caption:
        count === 0
          ? { en: "No share passed every question today", bn: "আজ কোনো শেয়ার সব প্রশ্নে পাস করেনি" }
          : premium
            ? { en: names(buyList.top.map((x) => x.code), count), bn: names(buyList.top.map((x) => x.code), count) }
            : free
              ? { en: `${free} is free today · the rest with Premium`, bn: `আজ ফ্রি: ${free} · বাকিগুলো প্রিমিয়ামে` }
              : { en: "The names come with Premium", bn: "নামগুলো প্রিমিয়ামে" },
    });
  }

  // 2 · Record dates in the next two weeks (one per company; "no dividend" rows left out)
  const firstPerCode = new Map<string, CorporateActionEvent>();
  for (const e of recordDates) {
    if (e.is_no_dividend || !e.record_date) continue;
    const code = e.trading_code.toUpperCase();
    if (!firstPerCode.has(code)) firstPerCode.set(code, e);
  }
  if (firstPerCode.size > 0) {
    const codes = Array.from(firstPerCode.keys());
    const own = codes.filter((c) => mine.has(c));
    const ordered = [...own, ...codes.filter((c) => !mine.has(c))];
    rows.push({
      key: "dividends",
      href: "/dividend-calendar#record-dates",
      Icon: IconCalendar,
      title: { en: "Record dates", bn: "রেকর্ড ডেট" },
      premiumPage: true,
      fresh: 0,
      value: codes.length,
      unit: { en: "in 2 weeks", bn: "2 সপ্তাহে" },
      caption: premium
        ? { en: names(ordered, codes.length), bn: names(ordered, codes.length) }
        : own.length > 0
          ? {
              en: `${own.length} ${own.length === 1 ? "is your share" : "are your shares"} · the rest with Premium`,
              bn: `${own.length}টি আপনার শেয়ার · বাকিগুলো প্রিমিয়ামে`,
            }
          : { en: "The company names come with Premium", bn: "কোম্পানির নাম প্রিমিয়ামে" },
    });
  }

  // 3 · Dividends coming to you (free; their own shares, money hidden until the eye says)
  const income = holdings && holdings.length > 0 && !loading ? buildIncome(todayIso, holdings, ownDividends) : [];
  if (income.length > 0) {
    const total = income.reduce((s, x) => s + x.cash, 0);
    const n = income.length;
    const listed = income.slice(0, 2);
    const rest = n - listed.length;
    const list = (lng: "en" | "bn") =>
      listed.map((x) => `${x.code} ${dayMonth(x.iso)[lng]}`).join(", ") + (rest > 0 ? ` +${rest}` : "");
    rows.push({
      key: "income",
      href: "/portfolio#dividends",
      Icon: IconCoin,
      title: { en: "Dividends coming to you", bn: "আপনার যে ডিভিডেন্ড আসছে" },
      premiumPage: false,
      fresh: 0,
      value: moneyShown ? `৳${bdGroup(total)}` : n,
      unit: moneyShown
        ? { en: "after tax", bn: "কর বাদে" }
        : { en: n === 1 ? "dividend" : "dividends", bn: "ডিভিডেন্ড" },
      caption: { en: `Record dates: ${list("en")}`, bn: `রেকর্ড ডেট: ${list("bn")}` },
    });
  }

  // 4 · Results posted this week (free; the reader's own shares named first)
  if (resultsWeek && resultsWeek.recent > 0) {
    const cutoff = daysBefore(todayIso, resultsWeek.days || 7);
    const own = Array.from(
      new Set((ownResults ?? []).filter((r) => (r.post_date ?? "") >= cutoff).map((r) => r.code.toUpperCase())),
    );
    const latest = resultsWeek.latest.filter((r) => (r.post_date ?? "") >= cutoff).map((r) => r.code);
    const n = resultsWeek.recent;
    const ownList = names(own, own.length);
    rows.push({
      key: "results",
      href: own.length > 0 ? "/results?level=mine" : "/results",
      Icon: IconFileText,
      title: { en: "Results this week", bn: "এই সপ্তাহের আর্থিক ফল" },
      premiumPage: false,
      fresh: 0,
      value: n,
      unit: { en: n === 1 ? "company" : "companies", bn: "কোম্পানি" },
      caption:
        own.length > 0
          ? {
              en: `${own.length} ${own.length === 1 ? "is your share" : "are your shares"}: ${ownList}`,
              bn: `${own.length}টি আপনার শেয়ার: ${ownList}`,
            }
          : latest.length > 0
            ? { en: `Latest: ${names(latest, n)}`, bn: `সর্বশেষ: ${names(latest, n)}` }
            : { en: "Every company's latest results", bn: "প্রতিটি কোম্পানির সর্বশেষ আর্থিক ফল" },
    });
  }

  // 5 · Companies to discover (the top three are free)
  if (forYou && forYou.items.length > 0) {
    const c = forYouCounts(forYou);
    const list = names(forYou.items.map((x) => x.code), c.total);
    rows.push({
      key: "discover",
      href: "/discover",
      Icon: IconCompass,
      title: { en: "Discover", bn: "খুঁজে দেখুন" },
      premiumPage: false,
      fresh: c.new,
      value: c.total,
      unit: { en: c.total === 1 ? "company" : "companies", bn: "কোম্পানি" },
      caption: { en: list, bn: list },
    });
  }

  if (rows.length === 0 && !dates && !loading) return null;

  const datesCard = dates ? (
    <div className="hm-tcard hm-dcard" data-card="row-dates">
      <div className="hm-tcard-head">
        <h3 className="hm-tcard-h">{bn ? "এই সপ্তাহে আপনার তারিখ" : "Your dates this week"}</h3>
        {dates.length > 0 && (
          <span className="hm-tcard-count nums">
            {bn ? `${dates.length}টি তারিখ` : `${dates.length} ${dates.length === 1 ? "date" : "dates"}`}
          </span>
        )}
      </div>
      {dates.length > 0 ? (
        <ul className="hm-dlist" id="hm-dlist">
          {(allDates ? dates : dates.slice(0, DATE_ROWS)).map((d) => (
            <li key={`${d.code}-${d.iso}-${d.what.en}`}>
              <Link href={d.href} className="hm-drow">
                <DateTile iso={d.iso} small soon={daysFrom(todayIso, d.iso) <= 1} />
                <span className="hm-drow-txt">
                  <b className="hm-drow-code">{d.code}</b>
                  <span className="hm-drow-what">
                    {pick(whenWord(todayIso, d.iso))} · {pick(d.what)}
                  </span>
                </span>
                <span className="hm-chev" aria-hidden>
                  <IconChevronRight size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hm-dnote">
          {bn
            ? "আগামী 7 দিনে আপনার শেয়ারে কোনো ফলের সভা, রেকর্ড ডেট বা এজিএম নেই।"
            : "No results meeting, record date or AGM on your shares in the next 7 days."}
        </p>
      )}
      {dates.length > DATE_ROWS && (
        <button
          type="button"
          className="hm-dmore"
          onClick={() => setAllDates((v) => !v)}
          aria-expanded={allDates}
          aria-controls="hm-dlist"
        >
          {allDates
            ? bn
              ? "কম দেখুন"
              : "Show fewer"
            : bn
              ? `সব ${dates.length}টি তারিখ দেখুন`
              : `See all ${dates.length} dates`}
          <IconChevronDown size={16} />
        </button>
      )}
    </div>
  ) : null;

  const sumCard =
    rows.length > 0 ? (
      <ul className="hm-tcard hm-sum">
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={r.href} className="hm-srow" data-card={`row-${r.key}`}>
              <span className="hm-srow-ic" aria-hidden>
                <r.Icon size={22} />
                {r.premiumPage && !premium && (
                  <span className="hm-crown">
                    <IconCrown size={11} />
                  </span>
                )}
              </span>
              <span className="hm-srow-txt">
                <span className="hm-srow-title">
                  {pick(r.title)}
                  {r.fresh > 0 && (
                    <span className="hm-new nums">{bn ? `${r.fresh}টি নতুন` : `${r.fresh} new`}</span>
                  )}
                  {r.premiumPage && !premium && <span className="sr-only">{bn ? " · প্রিমিয়াম" : " · Premium"}</span>}
                </span>
                <span className="hm-srow-cap">{pick(r.caption)}</span>
              </span>
              <span className="hm-srow-num">
                <b className="nums">{r.value}</b>
                <span>{pick(r.unit)}</span>
              </span>
              <span className="hm-chev" aria-hidden>
                <IconChevronRight size={16} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    ) : loading ? (
      <ul className="hm-tcard hm-sum" aria-hidden>
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <span className="hm-srow">
              <span className="hm-srow-ic animate-pulse" />
              <span className="grid gap-2">
                <span className="h-4 w-32 animate-pulse rounded-full bg-surface-2" />
                <span className="h-3 w-44 animate-pulse rounded-full bg-surface-2" />
              </span>
            </span>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <section className={`hm-today ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <div className="hm-head">
        <h2 className="hm-head-h">{bn ? "আজ আপনার জন্য" : "Today for you"}</h2>
      </div>
      <div className="hm-today-grid">
        {datesCard}
        {sumCard}
      </div>
    </section>
  );
}
