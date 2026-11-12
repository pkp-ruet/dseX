/**
 * The Premium renewal banner's rules (2026-11-13), pure. The banner shows on
 * top of every page while a reader's Premium ends within `RENEW_BANNER_DAYS`
 * (backend `payments.RENEW_BANNER_DAYS`), always offering the yearly plan.
 * A new plan's days start after the days still left (`payments.extend_until`),
 * so the banner names the exact date one more year would run to.
 *
 * Dates are Dhaka calendar days: Premium ending at 20:00 UTC ends on the next
 * day for the reader.
 */
import { bnDate } from "@/lib/bn";

export const RENEW_BANNER_DAYS = 10;
/** The last days, when the banner turns amber. */
export const RENEW_URGENT_DAYS = 3;
const DAY_MS = 86_400_000;
const DHAKA_MS = 6 * 3_600_000;

/** "2026-11-19": the Dhaka calendar day of an instant. */
export function dhakaDay(at: string | number | Date): string {
  const t = new Date(at).getTime();
  return new Date(t + DHAKA_MS).toISOString().slice(0, 10);
}

/** "19 Nov 2026" / "19 নভেম্বর 2026" for a Dhaka day. */
export function dayWords(day: string): { en: string; bn: string } {
  const d = new Date(`${day}T00:00:00Z`);
  const en = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return { en, bn: bnDate(day) };
}

/** "19 Nov" / "19 নভেম্বর" — the same date without the year. */
export function shortDayWords(day: string): { en: string; bn: string } {
  const w = dayWords(day);
  return { en: w.en.replace(/\s\d{4}$/, ""), bn: w.bn.replace(/\s\d{4}$/, "") };
}

/** Whole Dhaka days from today to the end day: 0 = ends today, 1 = tomorrow. */
export function daysToEnd(untilIso: string, now: number = Date.now()): number {
  const a = Date.parse(`${dhakaDay(now)}T00:00:00Z`);
  const b = Date.parse(`${dhakaDay(untilIso)}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

/** The end date after one more plan of `days` bought now (the backend rule). */
export function extendedUntil(untilIso: string | null | undefined, days: number, now: number = Date.now()): string {
  const cur = untilIso ? new Date(untilIso).getTime() : NaN;
  const base = Number.isFinite(cur) && cur > now ? cur : now;
  return new Date(base + days * DAY_MS).toISOString();
}

export type RenewStage = "calm" | "soon" | "last";

/** 10 to 4 days: calm (gold) · last 3 days: soon (amber) · today / tomorrow: last. */
export function renewStage(days: number): RenewStage {
  if (days <= 1) return "last";
  if (days <= RENEW_URGENT_DAYS) return "soon";
  return "calm";
}

/** Should the banner show? Premium (not an admin), ending within the window. */
export function inRenewWindow(untilIso: string | null | undefined, now: number = Date.now()): boolean {
  if (!untilIso) return false;
  const t = new Date(untilIso).getTime();
  if (!Number.isFinite(t) || t <= now) return false;
  return daysToEnd(untilIso, now) <= RENEW_BANNER_DAYS;
}

/** The close button's two choices, kept in localStorage per reader and end
 *  date, so a renewal (a new end date) starts fresh.
 *  "Remind me later": the value is the Dhaka day it was closed on; the banner
 *  comes back the next day. "Don't show again": hidden until this end date. */
export function laterKey(uid: string, untilIso: string): string {
  return `dsex.renew.later.${uid}.${dhakaDay(untilIso)}`;
}

export function neverKey(uid: string, untilIso: string): string {
  return `dsex.renew.never.${uid}.${dhakaDay(untilIso)}`;
}

export interface RenewalHave {
  watchlist: number;
  extra_portfolios: number;
  saved_screens: number;
  alerts: number;
  dividend_reminders: number;
}

type Line = { en: string; bn: string };
const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** What this reader set up that a free account limits — at most three lines,
 *  only where it applies. */
export function personalLosses(have: RenewalHave | null | undefined, free: { watchlist: number; alerts: number }): Line[] {
  if (!have) return [];
  const out: Line[] = [];
  if (have.extra_portfolios > 0) {
    const n = have.extra_portfolios;
    out.push({
      en: `Your ${n} extra ${s(n, "portfolio becomes", "portfolios become")} read-only.`,
      bn: `আপনার আরও ${n}টি পোর্টফোলিও শুধু দেখা যাবে, বদলানো যাবে না।`,
    });
  }
  if (have.watchlist > free.watchlist) {
    out.push({
      en: `You follow ${have.watchlist} shares. A free account follows ${free.watchlist}, so you can't add more.`,
      bn: `আপনি ${have.watchlist}টি শেয়ার ফলো করছেন। ফ্রি অ্যাকাউন্টে ${free.watchlist}টি, তাই নতুন যোগ করতে পারবেন না।`,
    });
  }
  if (have.saved_screens > 0) {
    const n = have.saved_screens;
    out.push({
      en: `Your ${n} saved ${s(n, "screen stops", "screens stop")} sending you new matches.`,
      bn: `আপনার ${n}টি সেভ করা স্ক্রিন আর নতুন মিলের খবর পাঠাবে না।`,
    });
  }
  if (have.dividend_reminders > 0) {
    const n = have.dividend_reminders;
    out.push({
      en: `Your ${n} dividend ${s(n, "reminder stops", "reminders stop")}.`,
      bn: `আপনার ${n}টি ডিভিডেন্ড রিমাইন্ডার বন্ধ হয়ে যাবে।`,
    });
  }
  if (have.alerts > free.alerts) {
    out.push({
      en: `You have ${have.alerts} price alerts on. A free account can set only ${free.alerts}.`,
      bn: `আপনার ${have.alerts}টি প্রাইস অ্যালার্ট চালু আছে। ফ্রি অ্যাকাউন্টে মাত্র ${free.alerts}টি রাখা যায়।`,
    });
  }
  return out.slice(0, 3);
}

/** What every Premium reader loses, said plainly. */
export const ALWAYS_LOST: Line[] = [
  { en: "Our full analysis on every share", bn: "প্রতিটি শেয়ারের পুরো বিশ্লেষণ" },
  { en: "Your portfolio check and your plan", bn: "আপনার পোর্টফোলিও চেক ও পরিকল্পনা" },
  { en: "News on your shares the same day, and the 9 AM brief", bn: "আপনার শেয়ারের খবর সেদিনই, আর সকাল 9টার ব্রিফ" },
  { en: "Today's Buy List and our research", bn: "আজকের কেনার তালিকা ও আমাদের গবেষণা" },
];
