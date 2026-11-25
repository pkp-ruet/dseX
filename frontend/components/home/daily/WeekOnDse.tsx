"use client";

import { useMemo, useState } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import type { HomeToday } from "@/lib/api";
import { firstDay, mineFirst, weekRow } from "@/lib/home-today";
import { dayParts } from "@/components/dividend-calendar/dates";
import { OwnerTag } from "@/components/home/personalized/OwnerMark";
import { shortName } from "@/lib/market-notices";
import { IconChevronRight } from "@/components/ui/icons";

/** Rows of one day before "and N more". */
const ROWS = 6;

/**
 * "This week on the DSE" (2026-11-25, the fuller home, addition C): the next
 * five trading days as a strip, each with a dot for dividend record dates and
 * one for results meetings; a tap shows that day's list, the reader's own
 * shares first (H / ★). Free: only record dates inside the dividend
 * calendar's free week and results meeting dates (both free everywhere); AGMs
 * stay off (the calendar keeps them Premium). "New on your shares" keeps the
 * next date on the reader's own shares; this is the whole market's week.
 *
 * Data: `HomeToday.days` (`/api/home/today`). Renders nothing on a week with
 * nothing on it. Arrays, not Sets, for the codes: the guest home passes them
 * from the server.
 */
export default function WeekOnDse({
  lang,
  days,
  todayIso,
  held = [],
  watched = [],
}: {
  lang: Lang;
  days: HomeToday["days"];
  todayIso: string;
  held?: string[];
  watched?: string[];
}) {
  const bn = lang === "bn";
  const list = days ?? [];
  const [sel, setSel] = useState(() => firstDay(list));
  const heldSet = useMemo(() => new Set(held.map((c) => c.toUpperCase())), [held]);
  const watchedSet = useMemo(() => new Set(watched.map((c) => c.toUpperCase())), [watched]);

  if (!list.some((d) => d.items.length > 0)) return null;
  const day = list[Math.min(sel, list.length - 1)];
  const rows = mineFirst(day.items, heldSet, watchedSet);
  const shown = rows.slice(0, ROWS);
  const more = rows.length - shown.length;
  const label = (iso: string) => {
    if (iso === todayIso) return bn ? "আজ" : "Today";
    const p = dayParts(iso);
    return p ? (bn ? p.weekday.bn.replace("বার", "") : p.weekday.en.slice(0, 3)) : iso;
  };

  return (
    <section className={`hm-week ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="week">
      <div className="hm-head">
        <div className="hm-head-txt">
          <h2 className="hm-head-h">{bn ? "এ সপ্তাহে ডিএসইতে" : "This week on the DSE"}</h2>
          <p className="hm-head-note">
            {bn ? "পরের পাঁচ কার্যদিবসের রেকর্ড ডেট আর ফলের বোর্ড সভা" : "Record dates and results meetings, the next five trading days"}
          </p>
        </div>
      </div>
      <div className="hm-tcard">
        <div className="hm-wk-days" role="tablist" aria-label={bn ? "দিন বেছে নিন" : "Pick a day"}>
          {list.map((d, i) => {
            const divs = d.items.filter((x) => x.kind === "dividend").length;
            const res = d.items.length - divs;
            const on = i === sel;
            return (
              <button
                key={d.date}
                type="button"
                role="tab"
                aria-selected={on}
                className="hm-wk-day"
                data-on={on ? "1" : undefined}
                data-empty={d.items.length === 0 ? "1" : undefined}
                onClick={() => setSel(i)}
              >
                <span className="hm-wk-wd">{label(d.date)}</span>
                <span className="hm-wk-dn nums">{dayParts(d.date)?.day ?? ""}</span>
                <span className="hm-wk-dots" aria-hidden>
                  {divs > 0 && <i className="hm-wk-dot hm-wk-dot--div" />}
                  {res > 0 && <i className="hm-wk-dot hm-wk-dot--res" />}
                </span>
                <span className="sr-only">
                  {bn
                    ? `${divs}টি রেকর্ড ডেট, ${res}টি ফলের সভা`
                    : `${divs} record ${divs === 1 ? "date" : "dates"}, ${res} results ${res === 1 ? "meeting" : "meetings"}`}
                </span>
              </button>
            );
          })}
        </div>
        <p className="hm-wk-key">
          <span>
            <i className="hm-wk-dot hm-wk-dot--div" aria-hidden />
            {bn ? "ডিভিডেন্ডের রেকর্ড ডেট" : "Dividend record date"}
          </span>
          <span>
            <i className="hm-wk-dot hm-wk-dot--res" aria-hidden />
            {bn ? "ফলের বোর্ড সভা" : "Results meeting"}
          </span>
        </p>
        {shown.length === 0 ? (
          <p className="hm-ours-quiet" role="tabpanel">
            {bn ? "এই দিনে কোনো রেকর্ড ডেট বা ফলের সভা নেই।" : "No record date or results meeting on this day."}
          </p>
        ) : (
          <ul className="hm-wk-list" role="tabpanel">
            {shown.map((it) => {
              const r = weekRow(it, todayIso);
              const c = it.code.toUpperCase();
              return (
                <li key={`${it.kind}-${it.code}`}>
                  <Link href={r.href} className="hm-wk-row">
                    <span className="hm-wk-txt">
                      <span className={`hm-wk-k hm-wk-k--${it.kind}`}>{bn ? r.kind.bn : r.kind.en}</span>
                      <span className="hm-wk-name">
                        <span className="hm-wk-co">{shortName(it.name, it.code)}</span>
                        <span className="hm-wk-code">{it.code}</span>
                        {heldSet.has(c) && <OwnerTag kind="portfolio" lang={lang} />}
                        {watchedSet.has(c) && <OwnerTag kind="watchlist" lang={lang} />}
                      </span>
                      <span className={`hm-wk-line hm-wk-line--${r.tone}`}>{bn ? r.line.bn : r.line.en}</span>
                    </span>
                    <span className="hm-chev" aria-hidden>
                      <IconChevronRight size={16} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/dividend-calendar#this-week" className="hm-dmore hm-ours-all">
          {more > 0
            ? bn
              ? `এই দিনে আরও ${more}টি · পুরো ক্যালেন্ডার দেখুন`
              : `${more} more on this day · See the whole calendar`
            : bn
              ? "পুরো ক্যালেন্ডার দেখুন"
              : "See the whole calendar"}
          <IconChevronRight size={16} />
        </Link>
      </div>
    </section>
  );
}
