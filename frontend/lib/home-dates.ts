import type { CorporateActionEvent, UpcomingResult } from "@/lib/api";
import { dayShort } from "@/components/dividend-calendar/dates";

/**
 * The dates on the reader's own shares for the home's "On your shares" block
 * (2026-11-20; it was "Your dates this week" in Today for you, 2026-11-17).
 * Pure, so the block and its tests read the same rules.
 */

export type Bi = { en: string; bn: string };

/** The home looks this many days ahead, today included. */
export const DATE_DAYS = 7;

export interface DateItem {
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
export function daysFrom(fromIso: string, iso: string): number {
  const a = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
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
export function buildDates(todayIso: string, results: UpcomingResult[], own: CorporateActionEvent[]): DateItem[] {
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
export function whenWord(todayIso: string, iso: string): Bi {
  const d = daysFrom(todayIso, iso);
  if (d === 0) return { en: "Today", bn: "আজ" };
  if (d === 1) return { en: "Tomorrow", bn: "আগামীকাল" };
  if (d === -1) return { en: "Yesterday", bn: "গতকাল" };
  const s = dayShort(iso);
  return { en: s.en.split(" ")[0], bn: s.bn.split(",")[0] };
}
