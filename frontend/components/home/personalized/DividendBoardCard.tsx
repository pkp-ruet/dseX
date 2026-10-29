"use client";

import { useState } from "react";
import type { CorporateActionEvent } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import DividendRow from "@/components/dividend-calendar/DividendRow";
import { DateHead, countByDate, groupByDate } from "@/components/dividend-calendar/DateGroup";
import LockPanel from "@/components/premium/LockPanel";
import { CALENDAR_PREVIEW_ROWS, FREE_CALENDAR_ROWS } from "@/lib/free-share";
import { usePremium } from "@/lib/premium";

const INITIAL = 6;
const DECLARED_ROWS = 3;

/**
 * "Dividends coming": every record date inside the next two weeks,
 * market-wide, in the dividend calendar's look (2026-10-28 clean redesign,
 * `dc-*` in app/styles/dividends.css). One lead line (how many companies,
 * how many are the reader's), then the dates in order — a small date tile,
 * the weekday and how far away it is, the last day to buy — and under each
 * date its companies with the cash a share leading. Then the latest
 * declarations. The reader's own stocks wear the H / ★ marks.
 *
 * Free readers get a glimpse (the nearest two companies), the next one with
 * the company hidden (every figure shown), and one line saying what Premium
 * shows: which companies pay on the rest, and how many are their own stocks
 * (`LockPanel`). The declarations list is Premium-only here.
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
  const { isPremium } = usePremium();
  const bn = lang === "bn";
  const rows = recordDates.filter((e) => !e.is_no_dividend);
  const declAll = declared.filter((e) => !e.is_no_dividend);
  if (rows.length === 0 && declAll.length === 0) return null;

  const free = !isPremium;
  const shown = free ? rows.slice(0, FREE_CALENDAR_ROWS.dashboard) : open ? rows : rows.slice(0, INITIAL);
  const decl = free ? [] : declAll.slice(0, DECLARED_ROWS);
  const isMine = (c: string) => held.has(c) || watched.has(c);
  const mine = new Set(rows.map((e) => e.trading_code).filter(isMine)).size;
  // Free readers: the rows past the glimpse are locked; the next one shows with
  // the company hidden, the lock line counts the rest and the reader's own.
  const hidden = free ? rows.slice(shown.length) : [];
  const masked = hidden.slice(0, CALENDAR_PREVIEW_ROWS.dashboard);
  const maskedSet = new Set(masked);
  const hiddenMine = new Set(hidden.map((e) => e.trading_code).filter(isMine)).size;
  const lockKey = hidden.length === 1 ? "divLockLineOne" : "divLockLine";
  const companies = new Set(rows.map((e) => e.trading_code)).size;
  const perDate = countByDate(rows, "record_date");
  const mark = (code: string) => <OwnerMark code={code} held={held} watched={watched} lang={lang} />;

  return (
    <section className={`soft-card dash-box overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "divBoardTitle")} href="/dividend-calendar" linkLabel={t(lang, "fullCalendar")} />

      {rows.length === 0 ? (
        <p className="dc-empty">{t(lang, "noDividendSoon")}</p>
      ) : (
        <>
          <p className="dc-card-lead">
            {companies === 1 ? t(lang, "divLeadOne") : t(lang, "divLead", { n: companies })}
            {mine > 0 && <> {mine === 1 ? t(lang, "divLeadMineOne") : t(lang, "divLeadMine", { n: mine })}</>}
          </p>
          {groupByDate([...shown, ...masked], "record_date").map((g) => (
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
                    {maskedSet.has(e) ? (
                      <DividendRow e={e} mode="record" masked />
                    ) : (
                      <DividendRow e={e} mode="record" mark={mark(e.trading_code)} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      {!free && rows.length > INITIAL && (
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

      {hidden.length > 0 && (
        <LockPanel job="find"
          title={{ en: t("en", lockKey, { n: hidden.length }), bn: t("bn", lockKey, { n: hidden.length }) }}
          mine={hiddenMine}
          count={hidden.length}
          lock="Dividend calendar: home card"
          what={{ en: "The full dividend calendar", bn: "পুরো ডিভিডেন্ড ক্যালেন্ডার" }}
        />
      )}
    </section>
  );
}
