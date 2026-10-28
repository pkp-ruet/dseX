"use client";

import { useState } from "react";
import type { CorporateActionEvent } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import DividendRow from "@/components/dividend-calendar/DividendRow";
import { DateHead, groupByDate } from "@/components/dividend-calendar/DateGroup";
import DividendPromo from "@/components/premium/DividendPromo";
import { FREE_CALENDAR_ROWS } from "@/lib/free-share";
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
 * Free readers get a glimpse (the nearest two companies) and a slim
 * `DividendPromo`: how many more dates, and how many of their own stocks,
 * sit behind it. The declarations list is Premium-only here.
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
  const more = rows.length - shown.length;
  const isMine = (c: string) => held.has(c) || watched.has(c);
  const mine = new Set(rows.map((e) => e.trading_code).filter(isMine)).size;
  const stakes = free
    ? [
        more > 0 ? t(lang, "divPromoMore", { n: more }) : "",
        mine > 0 ? t(lang, "divPromoMine", { n: mine }) : "",
        declAll.length > 0 ? t(lang, "divPromoDeclared", { n: declAll.length }) : "",
      ]
    : [];
  const companies = new Set(rows.map((e) => e.trading_code)).size;
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
          {groupByDate(shown, "record_date").map((g) => (
            <div key={g.date} className="dc-group">
              <DateHead
                iso={g.date}
                days={g.items[0].record_days_left}
                kind="record"
                first={g.items[0]}
                count={g.items.length}
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

      {free && <DividendPromo variant="card" stakes={stakes} />}
    </section>
  );
}
