"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Tabs from "@/components/ui/Tabs";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { usePremium } from "@/lib/premium";
import { money } from "@/lib/formatters";
import { PremiumTicks } from "@/components/premium/PremiumCard";
import { GoldLock, LockRow, PremiumSheetScope, type LockInfo, type PremiumPitch } from "@/components/premium/PremiumSheet";
import { DateHead } from "@/components/dividend-calendar/DateGroup";
import { dayShort, type Pair } from "@/components/dividend-calendar/dates";
import { CALENDAR_PREMIUM_ANCHOR } from "@/components/dividend-calendar/RemindButton";
import { DIVIDEND_TAX, useMainQty } from "@/components/dividend-calendar/IncomeCard";
import type { YoursInput } from "@/components/dividend-calendar/CalendarTabs";
import type { CalendarPromo, LockedCalendar, LockedDays, LockedList } from "@/lib/dividend-promo";

/**
 * The rest of the calendar, locked (2026-11-25, step 5 of the "One job, one
 * place" review: one way to show Premium, tried first here; user: no test,
 * switch everyone). It replaced the calendar's Premium card (`DividendPromo`).
 * Under the free week a reader without Premium sees the calendar itself —
 * the same tabs with their counts, every date and its last day to buy — with
 * a gold lock where each company and amount would be. Any lock opens the one
 * Premium sheet: what that lock opens, then what the card used to say, the
 * price and one button. The real calendar stays in the HTML under the page's
 * one gate (`PageGate`), so nothing changes for search or for Premium.
 */

/** What a Premium reader sees, in four plain lines (the card's, moved). */
const GETS: Pair[] = [
  { en: "Every record date ahead, not only this week", bn: "শুধু এই সপ্তাহ নয়, সামনের সব রেকর্ড ডেট" },
  { en: "Who declares next, and roughly when", bn: "এরপর কে ঘোষণা দেবে, আর মোটামুটি কবে" },
  { en: "Your own dividends in taka, month by month", bn: "আপনার নিজের ডিভিডেন্ড, মাসে মাসে টাকায়" },
  { en: "As many reminders on the last day to buy as you want", bn: "কেনার শেষ দিনে যত খুশি রিমাইন্ডার" },
];

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

type Mine = {
  total: number;
  shares: number;
  rows: { code: string; date: string }[];
  /** Shares we expect to pay (they paid last year, nothing declared yet). */
  expected: number;
};

/** The reader's own dividends, from their main portfolio: declared cash
 *  after tax, and how many more of their shares we expect to pay. */
function useMine(yours: YoursInput | undefined): Mine | null {
  const qty = useMainQty();
  return useMemo(() => {
    if (!yours || !qty || qty.size === 0) return null;
    let total = 0;
    const rows: Mine["rows"] = [];
    const declared = new Set<string>();
    for (const e of yours.records) {
      const code = e.trading_code.toUpperCase();
      const q = qty.get(code);
      if (!q || !e.record_date || !e.cash_per_share || e.record_date < yours.today) continue;
      total += q * e.cash_per_share * (1 - DIVIDEND_TAX);
      declared.add(code);
      rows.push({ code, date: e.record_date });
    }
    const expected = new Set(
      yours.forecast
        .map((f) => f.trading_code.toUpperCase())
        .filter((c) => qty.has(c) && !declared.has(c)),
    ).size;
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return { total, shares: declared.size, rows, expected };
  }, [yours, qty]);
}

/* Each lock says what it opens, in one sentence. */
const recordLock = (iso: string): LockInfo => {
  const d = dayShort(iso);
  return {
    key: "dc-record",
    what: {
      en: `Which company's record date is ${d.en}, and how much it pays a share.`,
      bn: `${d.bn} কোন কোম্পানির রেকর্ড ডেট, আর শেয়ারপ্রতি কত টাকা দেবে।`,
    },
  };
};
const recordMoreLock = (n: number): LockInfo => ({
  key: "dc-record-more",
  what: {
    en: `The other ${n} record date${s(n, "", "s")} ahead: each company, how much a share, and the last day to buy.`,
    bn: `সামনের বাকি ${n}টি রেকর্ড ডেট: প্রতিটি কোম্পানি, শেয়ারপ্রতি কত, আর কেনার শেষ দিন।`,
  },
});
const COMING_LOCK: LockInfo = {
  key: "dc-coming",
  what: {
    en: "Which companies paid a dividend last year and haven't declared yet, what they paid, and roughly when to look.",
    bn: "কোন কোম্পানিগুলো গত বছর ডিভিডেন্ড দিয়েছিল কিন্তু এবার এখনো ঘোষণা দেয়নি, কত দিয়েছিল, আর মোটামুটি কবে খেয়াল রাখবেন।",
  },
};
const recentLock = (iso: string | null): LockInfo => {
  const d = iso ? dayShort(iso) : null;
  return {
    key: "dc-recent",
    what: d
      ? {
          en: `Which company declared a dividend on ${d.en}, how much, and its record date.`,
          bn: `${d.bn} কোন কোম্পানি ডিভিডেন্ড ঘোষণা দিয়েছে, কত, আর তার রেকর্ড ডেট।`,
        }
      : {
          en: "Which companies declared a dividend lately, how much, and their record dates.",
          bn: "সম্প্রতি কোন কোম্পানিগুলো ডিভিডেন্ড ঘোষণা দিয়েছে, কত, আর তাদের রেকর্ড ডেট।",
        },
  };
};
const agmLock = (iso: string): LockInfo => {
  const d = dayShort(iso);
  return {
    key: "dc-agm",
    what: {
      en: `Which company holds its AGM on ${d.en}, and its dividend.`,
      bn: `${d.bn} কোন কোম্পানির এজিএম, আর তার ডিভিডেন্ড।`,
    },
  };
};
const agmMoreLock = (n: number): LockInfo => ({
  key: "dc-agm-more",
  what: {
    en: `The other ${n} AGM${s(n, "", "s")} ahead: which company, and its dividend.`,
    bn: `সামনের বাকি ${n}টি এজিএম: কোন কোম্পানির, আর তার ডিভিডেন্ড।`,
  },
});
const YOURS_LOCK: LockInfo = {
  key: "dc-yours",
  what: {
    en: "Which of your shares pay, how much each after tax, and on which record date.",
    bn: "আপনার কোন শেয়ার ডিভিডেন্ড দিচ্ছে, কর কাটার পর প্রতিটিতে কত, আর কোন রেকর্ড ডেটে।",
  },
};

/** A grey bar where the company's name would be. */
function Bar({ w }: { w: number }) {
  return (
    <>
      <span className="lk-mask dcl-bar" style={{ width: `${w}px` }} aria-hidden="true" />
      <span className="sr-only">
        <T en="Company shown in Premium" bn="কোম্পানির নাম প্রিমিয়ামে" />
      </span>
    </>
  );
}

/** "And N more …" as one lock at the end of a list. */
function MoreRow({ lock, text }: { lock: LockInfo; text: Pair }) {
  return (
    <li>
      <LockRow lock={lock} className="dcl-more">
        <span className="dcl-more-t">
          <T en={text.en} bn={text.bn} />
        </span>
      </LockRow>
    </li>
  );
}

/** Record dates or AGMs: each date's head, free; its companies, locked. */
function LockedDayList({ list, kind }: { list: LockedDays; kind: "record" | "agm" }) {
  if (list.total === 0) {
    return (
      <div className="soft-card">
        <p className="dc-empty">
          {kind === "record" ? (
            <T en="No other record date is set yet." bn="আর কোনো রেকর্ড ডেট এখনো ঠিক হয়নি।" />
          ) : (
            <T en="No AGM is set yet." bn="কোনো এজিএম এখনো ঠিক হয়নি।" />
          )}
        </p>
      </div>
    );
  }
  return (
    <div className="soft-card dc-board">
      {list.days.map((d) => (
        <div key={d.date} className="dc-group">
          <DateHead
            iso={d.date}
            days={d.days}
            kind={kind}
            first={{ buy_by: d.buy_by, buy_days_left: d.buy_days_left }}
            count={d.n}
            flush
          />
          <ul className="dc-list">
            {d.rows.map((w, i) => (
              <li key={i}>
                <LockRow lock={kind === "record" ? recordLock(d.date) : agmLock(d.date)}>
                  <Bar w={w} />
                </LockRow>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {list.more > 0 && (
        <ul className="dc-list dcl-tail">
          <MoreRow
            lock={kind === "record" ? recordMoreLock(list.more) : agmMoreLock(list.more)}
            text={
              kind === "record"
                ? { en: `And ${list.more} more record date${s(list.more, "", "s")}`, bn: `আরও ${list.more}টি রেকর্ড ডেট` }
                : { en: `And ${list.more} more AGM${s(list.more, "", "s")}`, bn: `আরও ${list.more}টি এজিএম` }
            }
          />
        </ul>
      )}
    </div>
  );
}

/** Coming next or Just declared: rows without dates of their own. */
function LockedRows({ list, kind }: { list: LockedList; kind: "coming" | "recent" }) {
  return (
    <div className="soft-card dc-board">
      <ul className="dc-list">
        {list.rows.map((r, i) => (
          <li key={i}>
            <LockRow lock={kind === "coming" ? COMING_LOCK : recentLock(r.date)}>
              <Bar w={r.w} />
              {kind === "recent" && r.date && (
                <span className="dcl-sub">
                  <T en={`Declared ${dayShort(r.date).en}`} bn={`ঘোষণা ${dayShort(r.date).bn}`} />
                </span>
              )}
            </LockRow>
          </li>
        ))}
        {list.more > 0 && (
          <MoreRow
            lock={kind === "coming" ? COMING_LOCK : { ...recentLock(null), key: "dc-recent-more" }}
            text={
              kind === "coming"
                ? { en: `And ${list.more} more compan${s(list.more, "y", "ies")}`, bn: `আরও ${list.more}টি কোম্পানি` }
                : { en: `And ${list.more} more announcement${s(list.more, "", "s")}`, bn: `আরও ${list.more}টি ঘোষণা` }
            }
          />
        )}
      </ul>
    </div>
  );
}

/** One plain lead line over a panel. */
function Lead({ text }: { text: Pair }) {
  return (
    <p className="dc-panel-lead dcl-lead">
      <T en={text.en} bn={text.bn} />
    </p>
  );
}

/** The reader's own dividends: the total free, which shares behind a lock
 *  (open during the 7-day taste, THE Premium line step 6). */
function YourLine({ mine }: { mine: Mine }) {
  const { sharesOpen } = usePremium();
  return (
    <div className="dcl-you">
      {mine.shares > 0 && (
        <p className="dcl-you-line">
          <T
            en={`${money(mine.total)} is coming to ${mine.shares} of your shares from dividends already declared, after 10% tax.`}
            bn={`ইতিমধ্যে ঘোষিত ডিভিডেন্ড থেকে আপনার ${mine.shares}টি শেয়ারে আসছে ${money(mine.total)}, 10% কর কাটার পর।`}
          />
        </p>
      )}
      {mine.expected > 0 && (
        <p className="dcl-you-line">
          <T
            en={`${mine.expected} more of your shares paid last year and haven't declared yet.`}
            bn={`আপনার আরও ${mine.expected}টি শেয়ার গত বছর ডিভিডেন্ড দিয়েছিল, এবার এখনো ঘোষণা দেয়নি।`}
          />
        </p>
      )}
      {sharesOpen && mine.rows.length > 0 ? (
        <p className="dcl-you-codes">
          {mine.rows.map((r) => {
            const d = dayShort(r.date);
            return (
              <span key={`${r.code}-${r.date}`}>
                <b>{r.code}</b> <T en={d.en} bn={d.bn} />
              </span>
            );
          })}
        </p>
      ) : (
        <GoldLock lock={YOURS_LOCK} label={{ en: "See which shares", bn: "কোন শেয়ার দেখুন" }} className="dcl-you-lock" />
      )}
    </div>
  );
}

type Panel = { key: string; label: Pair; short?: Pair; count: number; body: ReactNode };

export default function CalendarLocks({
  promo,
  locked,
  yours,
}: {
  promo: CalendarPromo;
  locked: LockedCalendar;
  yours?: YoursInput;
}) {
  const { bn } = useLang();
  const mine = useMine(yours);
  const personal = mine != null && (mine.shares > 0 || mine.expected > 0);

  // The card's words, moved into the sheet.
  const pitch: PremiumPitch = {
    area: "dividend-calendar",
    src: "dividend-calendar",
    tag: { en: "Dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" },
    title: { en: "Never miss a dividend.", bn: "কোনো ডিভিডেন্ড আর মিস করবেন না।" },
    lead: {
      en: `After this week come ${promo.after} more record date${s(promo.after, "", "s")}, and ${promo.comingNext} compan${s(promo.comingNext, "y", "ies")} we expect to declare next. Premium shows every one${personal ? ", and works out the dividends coming to your own shares" : ""}.`,
      bn: `এই সপ্তাহের পর আরও ${promo.after}টি রেকর্ড ডেট, আর ${promo.comingNext}টি কোম্পানি এরপর ঘোষণা দিতে পারে। প্রিমিয়াম সবগুলো দেখায়${personal ? ", আর আপনার নিজের শেয়ারে কত ডিভিডেন্ড আসছে তা হিসাব করে দেয়" : ""}।`,
    },
    body: <PremiumTicks items={GETS} />,
    cta: personal
      ? { en: "See which of your shares pay", bn: "আপনার কোন শেয়ার দিচ্ছে দেখুন" }
      : { en: "See every dividend ahead", bn: "সামনের সব ডিভিডেন্ড দেখুন" },
    context: { label: { en: "The full dividend calendar", bn: "পুরো ডিভিডেন্ড ক্যালেন্ডার" }, stakes: GETS.slice(0, 3) },
    track: { variant: "sheet-v1", after: promo.after, next: promo.comingNext, personal: personal ? 1 : 0 },
  };

  const panels: Panel[] = [
    {
      key: "record-dates",
      label: { en: "Record dates", bn: "রেকর্ড ডেট" },
      count: locked.record.total,
      body: <LockedDayList list={locked.record} kind="record" />,
    },
    {
      key: "coming-next",
      label: { en: "Coming next", bn: "সামনে আসছে" },
      short: { en: "Next", bn: "আসছে" },
      count: locked.coming.total,
      body: (
        <>
          <Lead
            text={{
              en: `${locked.coming.total} compan${s(locked.coming.total, "y", "ies")} paid a cash dividend last year and ${s(locked.coming.total, "hasn't", "haven't")} declared for this year yet.`,
              bn: `${locked.coming.total}টি কোম্পানি গত বছর নগদ ডিভিডেন্ড দিয়েছিল, এবার এখনো ঘোষণা দেয়নি।`,
            }}
          />
          <LockedRows list={locked.coming} kind="coming" />
        </>
      ),
    },
    {
      key: "recent",
      label: { en: "Just declared", bn: "সদ্য ঘোষিত" },
      short: { en: "Declared", bn: "নতুন" },
      count: locked.recent.total,
      body: (
        <>
          <Lead text={{ en: "The newest announcements first.", bn: "সবচেয়ে নতুন ঘোষণা আগে।" }} />
          <LockedRows list={locked.recent} kind="recent" />
        </>
      ),
    },
    {
      key: "agms",
      label: { en: "AGMs", bn: "এজিএম" },
      count: locked.agms.total,
      body: <LockedDayList list={locked.agms} kind="agm" />,
    },
  ].filter((p) => p.key === "record-dates" || p.count > 0);

  const [active, setActive] = useState(panels[0]?.key ?? "record-dates");
  const top = useRef<HTMLElement>(null);

  // A link to one of the calendar's lists (#coming-next …) opens its locked twin.
  useEffect(() => {
    const pick = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      const key = id === "your-dividends" ? "record-dates" : id;
      if (!panels.some((p) => p.key === key)) return;
      setActive(key);
      requestAnimationFrame(() => top.current?.scrollIntoView({ block: "start" }));
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
    // The panel keys don't change after the first render.
  }, []);

  return (
    <PremiumSheetScope pitch={pitch} anchor={CALENDAR_PREMIUM_ANCHOR} className="dcl">
      <section ref={top} className="dc-cal dcl-cal" aria-labelledby="dcl-title">
        <div className="dc-panel-head">
          <h2 id="dcl-title" className="dc-panel-title">
            <T en="After this week" bn="এই সপ্তাহের পরে" />
          </h2>
          <p className="dc-panel-lead">
            <T
              en="The dates are here for everyone. Which companies pay, and how much, is in Premium. Tap a lock to see what it opens."
              bn="তারিখগুলো সবার জন্য। কোন কোম্পানি দিচ্ছে আর কত, তা প্রিমিয়ামে। কোন তালায় কী আছে দেখতে ট্যাপ করুন।"
            />
          </p>
        </div>

        {personal && mine && <YourLine mine={mine} />}

        <div className="dc-tabs" style={{ "--dc-tabs": panels.length } as CSSProperties}>
          <Tabs
            idBase="dcl"
            ariaLabel={bn ? "ক্যালেন্ডারের তালিকা" : "Calendar lists"}
            value={active}
            onChange={setActive}
            className="dc-tabrow"
            tabs={panels.map((p) => ({
              key: p.key,
              label: (
                <>
                  <span className="dc-tab-l">
                    <span className="dc-tab-long">
                      <T en={p.label.en} bn={p.label.bn} />
                    </span>
                    <span className="dc-tab-short">
                      <T en={(p.short ?? p.label).en} bn={(p.short ?? p.label).bn} />
                    </span>
                  </span>
                  <span className="dc-tab-n">{p.count}</span>
                </>
              ),
            }))}
          />
        </div>
        {panels.map((p) => (
          <div
            key={p.key}
            id={`dcl-p-${p.key}`}
            role="tabpanel"
            aria-labelledby={`dcl-${p.key}`}
            className="dc-panel"
            data-active={p.key === active ? "true" : "false"}
          >
            {p.body}
          </div>
        ))}
      </section>
    </PremiumSheetScope>
  );
}
