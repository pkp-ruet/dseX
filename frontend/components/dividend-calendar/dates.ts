/**
 * Date words for the dividend calendar, in both languages. Plain module (no
 * JSX, no "use client") so the server boards and the dashboard card share it.
 * ISO dates are read as calendar dates (UTC parts), so a server in another
 * timezone never shifts a record date by a day.
 */

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];
/** Short enough for the 52px date tile. */
const BN_MONTHS_SHORT = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const BN_DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const BN_DAYS_SHORT = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"];

export type Pair = { en: string; bn: string };

function parse(iso: string | null | undefined): Date | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The date tile: day number + short month, and the weekday in words. */
export function dayParts(iso: string | null | undefined) {
  const d = parse(iso);
  if (!d) return null;
  const m = d.getUTCMonth();
  const w = d.getUTCDay();
  return {
    day: d.getUTCDate(),
    month: { en: EN_MONTHS[m], bn: BN_MONTHS_SHORT[m] },
    weekday: { en: EN_DAYS[w], bn: BN_DAYS[w] },
  };
}

/** "Thu 30 Oct" / "বৃহস্পতি, 30 অক্টোবর" — or with the year and no weekday
 *  ("12 Nov 2025") for a date in the past year. */
export function dayShort(iso: string | null | undefined, withYear = false): Pair {
  const d = parse(iso);
  if (!d) return { en: "—", bn: "—" };
  const day = d.getUTCDate();
  const m = d.getUTCMonth();
  if (withYear) {
    const y = d.getUTCFullYear();
    return { en: `${day} ${EN_MONTHS[m]} ${y}`, bn: `${day} ${BN_MONTHS[m]} ${y}` };
  }
  const w = d.getUTCDay();
  return { en: `${EN_DAYS[w].slice(0, 3)} ${day} ${EN_MONTHS[m]}`, bn: `${BN_DAYS_SHORT[w]}, ${day} ${BN_MONTHS[m]}` };
}

/** "today" / "tomorrow" / "in 5 days"; null when unknown or past. */
export function daysWords(n: number | null | undefined): Pair | null {
  if (n == null || n < 0) return null;
  if (n === 0) return { en: "today", bn: "আজ" };
  if (n === 1) return { en: "tomorrow", bn: "আগামীকাল" };
  return { en: `in ${n} days`, bn: `${n} দিন পর` };
}
