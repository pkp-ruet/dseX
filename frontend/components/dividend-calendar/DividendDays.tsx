import { T } from "@/components/i18n/T";
import { dayParts } from "@/components/dividend-calendar/dates";
import { perShareTk } from "@/components/dividend-calendar/DividendRow";
import type { PromoDay } from "@/lib/dividend-promo";

/**
 * Record dates by day, counts only (2026-11-04): how many companies have a
 * record date that day, up to how much cash a share, how many are the
 * reader's, how many look at risk. Never a company name — what a free reader
 * sees of the dividend calendar on its Premium card, the dashboard's
 * record-dates card and market analysis. `spx-days` look (report-visuals.css).
 */
export default function DividendDays({
  days,
  shown = days.length,
  mine,
  toned = true,
  only,
  className = "",
}: {
  days: PromoDay[];
  shown?: number;
  /** How many of that day's record dates are the reader's. */
  mine?: (date: string) => number;
  /** Colour each day's dot by "Is it safe?" (off where the rows carry no safety word). */
  toned?: boolean;
  /** One language only, as plain text (`/share-bazar` is a Bengali article for every reader). */
  only?: "en" | "bn";
  className?: string;
}) {
  if (days.length === 0) return null;
  return (
    <ol className={`spx-days ${className}`.trim()}>
      {days.slice(0, shown).map((d) => (
        <DayLine key={d.date} day={d} mine={mine?.(d.date) ?? 0} toned={toned} only={only} />
      ))}
    </ol>
  );
}

function DayLine({ day, mine, toned, only }: { day: PromoDay; mine: number; toned: boolean; only?: "en" | "bn" }) {
  const p = dayParts(day.date);
  const tk = day.maxCash > 0 ? perShareTk(day.maxCash) : null;
  const tone = !toned ? undefined : day.risk > 0 ? "bad" : day.watch > 0 ? "fair" : "good";
  const what: { en: string; bn: string } =
    day.n === 1
      ? tk
        ? { en: `1 company pays ${tk} a share`, bn: `1টি কোম্পানি দেবে শেয়ারপ্রতি ${tk}` }
        : { en: "1 company gives bonus shares", bn: "1টি কোম্পানি দেবে বোনাস শেয়ার" }
      : tk
        ? { en: `${day.n} companies, up to ${tk} a share in cash`, bn: `${day.n}টি কোম্পানি, নগদ শেয়ারপ্রতি সর্বোচ্চ ${tk}` }
        : { en: `${day.n} companies give bonus shares`, bn: `${day.n}টি কোম্পানি দেবে বোনাস শেয়ার` };
  const en = what.en + (mine > 0 ? ` · ${mine} of yours` : "") + (day.risk > 0 ? ` · ${day.risk} at risk` : "");
  const bn = what.bn + (mine > 0 ? ` · ${mine}টি আপনার` : "") + (day.risk > 0 ? ` · ${day.risk}টি ঝুঁকিতে` : "");
  const say = (e: string, b: string) => (only === "bn" ? b : only === "en" ? e : <T en={e} bn={b} />);
  return (
    <li data-tone={tone}>
      <span className="spx-day">{p ? say(`${p.day} ${p.month.en}`, `${p.day} ${p.month.bn}`) : day.date}</span>
      <span>{say(en, bn)}</span>
    </li>
  );
}
