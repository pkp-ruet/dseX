"use client";

import { useState } from "react";
import type { CorporateActionEvent } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import DividendRow from "@/components/dividend-calendar/DividendRow";
import { DateHead, countByDate, groupByDate } from "@/components/dividend-calendar/DateGroup";
import DividendDays from "@/components/dividend-calendar/DividendDays";
import { CALENDAR_PREMIUM_ANCHOR } from "@/components/dividend-calendar/RemindButton";
import AnswerLock from "@/components/premium/AnswerLock";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { groupDays } from "@/lib/dividend-promo";

const INITIAL = 6;
const DECLARED_ROWS = 3;
const DAYS_SHOWN = 5;

/**
 * "Dividends coming": every record date inside the next two weeks,
 * market-wide, in the dividend calendar's look (2026-10-28 clean redesign,
 * `dc-*` in app/styles/dividends.css). One lead line (how many companies,
 * how many are the reader's), then the dates in order — a small date tile,
 * the weekday and how far away it is, the last day to buy — and under each
 * date its companies with the cash a share leading. Then the latest
 * declarations. The reader's own stocks wear the H / ★ marks.
 *
 * Premium since 2026-11-04, with the whole dividend calendar (user: "Lock
 * them too"). A free reader keeps the lead line and the dates as counts
 * (`DividendDays`: how many pay each day, up to how much, how many are
 * theirs or at risk); the companies sit under one Premium line that opens
 * the calendar's Premium card. The reader's own record dates stay free in
 * their stories, the watchlist and the stock pages.
 */
export default function DividendBoardCard({
  recordDates,
  declared,
  held,
  watched,
  lang = "en",
}: {
  recordDates: CorporateActionEvent[];
  declared: CorporateActionEvent[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const [open, setOpen] = useState(false);
  const premium = usePremiumOpen();
  const bn = lang === "bn";
  const rows = recordDates.filter((e) => !e.is_no_dividend);
  const declAll = declared.filter((e) => !e.is_no_dividend);
  if (rows.length === 0 && declAll.length === 0) return null;

  const shown = open ? rows : rows.slice(0, INITIAL);
  const decl = declAll.slice(0, DECLARED_ROWS);
  const isMine = (c: string) => held.has(c) || watched.has(c);
  const mine = new Set(rows.map((e) => e.trading_code).filter(isMine)).size;
  const companies = new Set(rows.map((e) => e.trading_code)).size;
  const perDate = countByDate(rows, "record_date");
  const mark = (code: string) => <OwnerMark code={code} held={held} watched={watched} lang={lang} />;
  const days = groupDays(
    rows
      .filter((e) => e.record_date)
      .map((e) => ({ date: e.record_date as string, cash: e.cash_per_share ?? 0, level: e.safety?.level })),
  );
  const mineOn = (date: string) => rows.filter((e) => e.record_date === date && isMine(e.trading_code)).length;
  const moreDays = days.length - DAYS_SHOWN;

  // The companies themselves: Premium (one line for a free reader).
  const list = (
    <>
      {rows.length > 0 &&
        groupByDate(shown, "record_date").map((g) => (
          <div key={g.date} className="dc-group">
            <DateHead
              iso={g.date}
              days={g.items[0].record_days_left}
              kind="record"
              first={g.items[0]}
              count={perDate.get(g.date) ?? g.items.length}
              flush
            />
            <ul className="dc-list">
              {g.items.map((e) => (
                <li key={`${e.trading_code}-${e.record_date}`}>
                  <DividendRow e={e} mode="record" mark={mark(e.trading_code)} />
                </li>
              ))}
            </ul>
          </div>
        ))}

      {rows.length > INITIAL && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="dc-more">
          {open ? t(lang, "showFewer") : t(lang, "showAll", { n: rows.length })}
        </button>
      )}

      {decl.length > 0 && (
        <>
          <h4 className="dc-card-label">{t(lang, "justDeclared")}</h4>
          <ul className="dc-list">
            {decl.map((e) => (
              <li key={`${e.trading_code}-${e.declaration_date}`}>
                <DividendRow e={e} mode="declared" mark={mark(e.trading_code)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );

  return (
    <section className={`soft-card dash-box overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "divBoardTitle")} href="/dividend-calendar" linkLabel={t(lang, "fullCalendar")} />

      {rows.length === 0 ? (
        <p className="dc-empty">{t(lang, "noDividendSoon")}</p>
      ) : (
        <p className="dc-card-lead">
          {companies === 1 ? t(lang, "divLeadOne") : t(lang, "divLead", { n: companies })}
          {mine > 0 && <> {mine === 1 ? t(lang, "divLeadMineOne") : t(lang, "divLeadMine", { n: mine })}</>}
        </p>
      )}

      {/* A free reader: the dates as counts, no company. */}
      {!premium && days.length > 0 && (
        <div className="dc-card-days">
          <DividendDays days={days} shown={DAYS_SHOWN} mine={mineOn} />
          {moreDays > 0 && (
            <p className="spx-days-more">
              {bn ? `আরও ${moreDays} দিন।` : `And ${moreDays} more day${moreDays === 1 ? "" : "s"}.`}
            </p>
          )}
        </div>
      )}

      <AnswerLock
        variant="line"
        job="find"
        lock="dash-dividends"
        href={`/dividend-calendar#${CALENDAR_PREMIUM_ANCHOR}`}
        what={{ en: "The dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" }}
        lines={[
          decl.length > 0 && rows.length === 0
            ? { en: "Which companies just declared a dividend, and whether each one looks safe", bn: "কোন কোম্পানি সদ্য ডিভিডেন্ড ঘোষণা করল, আর প্রতিটি নিরাপদ কি না" }
            : { en: "Which companies, the cash a share, the last day to buy and whether each one looks safe", bn: "কোন কোম্পানি, শেয়ারপ্রতি নগদ, কেনার শেষ দিন আর প্রতিটি নিরাপদ কি না" },
        ]}
        boxClassName="dc-card-lock"
      >
        {list}
      </AnswerLock>

    </section>
  );
}
