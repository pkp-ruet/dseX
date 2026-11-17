"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import type { PortfolioHolding, ScoreItem } from "@/lib/api";
import { analyzePortfolio } from "@/lib/portfolio-analysis";
import { computedRows } from "@/lib/home-portfolio";
import type { ReportKeys } from "@/lib/auth";
import { bdGroup, takaGroup } from "@/lib/formatters";
import { bstHour } from "@/lib/market-hours";
import { daysToEnd, inRenewWindow, renewStage } from "@/lib/renewal";
import { t } from "@/lib/home-copy";
import { trackEvent } from "@/lib/track";
import MarketStatusPill from "@/components/home/personalized/MarketStatusPill";
import { openGlobalSearch } from "@/components/layout/GlobalSearch";
import { IconBook, IconChevronRight, IconCrown, IconEye, IconEyeOff, IconPlus, IconSearch } from "@/components/ui/icons";

/** "1" once the reader chose to show the value on this device; anything else = hidden. */
const SHOW_KEY = "dsex.home.showMoney";

function readShown(): boolean {
  try {
    return localStorage.getItem(SHOW_KEY) === "1";
  } catch {
    return false;
  }
}

function greetingForHour(h: number, lang: Lang): string {
  if (h < 12) return t(lang, "goodMorning");
  if (h < 17) return t(lang, "goodAfternoon");
  return t(lang, "goodEvening");
}

/** ± taka with the South-Asian grouping: "+৳12,300" / "−৳3,200". */
function signedTaka(v: number): string {
  return `${v >= 0 ? "+" : "−"}৳${bdGroup(Math.abs(v))}`;
}

/** A Premium reader's chip: only a reminder in the renewal banner's window
 *  (the last 10 Dhaka days), else nothing — the end date is not news every day. */
function renewWords(premiumUntil: string | null | undefined, bn: boolean): { text: string; urgent: boolean } | null {
  if (!premiumUntil || !inRenewWindow(premiumUntil)) return null;
  const days = daysToEnd(premiumUntil);
  const when =
    days <= 0
      ? { en: "today", bn: "আজ" }
      : days === 1
        ? { en: "tomorrow", bn: "আগামীকাল" }
        : { en: `in ${days} days`, bn: `${days} দিনে` };
  return {
    text: bn ? `প্রিমিয়াম ${when.bn} শেষ হচ্ছে · নবায়ন করুন` : `Premium ends ${when.en} · Renew`,
    urgent: renewStage(days) !== "calm",
  };
}

/** A free reader's chip: the free analyses left this month. */
function planWords(keys: ReportKeys | null | undefined, bn: boolean): string {
  if (!keys) return bn ? "ফ্রি প্ল্যান · প্রিমিয়াম দেখুন" : "Free plan · See Premium";
  if (keys.left > 0) {
    return bn
      ? `ফ্রি প্ল্যান · ${keys.per_month}টির মধ্যে ${keys.left}টি বিশ্লেষণ বাকি`
      : `Free plan · ${keys.left} of ${keys.per_month} analyses left`;
  }
  return bn
    ? `ফ্রি প্ল্যান · এ মাসের ${keys.per_month}টি বিশ্লেষণ পড়া শেষ`
    : `Free plan · all ${keys.per_month} analyses read this month`;
}

/**
 * The top of the signed-in home (2026-11-17, the bKash-style home): the
 * reader's initial, the date and market state, the greeting, ONE button for
 * their money, and a search field.
 *
 * The money button: like bKash's "see balance", the value starts hidden on a
 * new device (privacy on a shared or public phone); once the reader shows or
 * hides it, this device remembers. Shown, it reads two lines — the value and
 * today's move, then what they made since they bought and the portfolio's
 * grade — and splits in two: the eye hides it again, the rest opens the
 * portfolio. "Add your shares" for a reader without a portfolio.
 *
 * The search field opens the site's search (`GlobalSearch`, the same one as
 * the navbar's and the bottom bar's): looking up one share is the most common
 * reason to open the site.
 *
 * Round 2 (2026-11-18): a plan chip under the greeting — a free reader's
 * analyses left this month (one tap to /premium); a Premium reader gets it
 * only as a reminder in the renewal banner's window (the last 10 days: "Premium
 * ends in 6 days · Renew", amber in the last 3), else nothing; once shown, the
 * money is the biggest number on the screen, the eye is a 44px button and the
 * arrow is part of the link; before the open the move says "Last close".
 *
 * Replaced `HeroGreeting` + `MoneyHero` / `MoneyHeroGhost` on the home page.
 */
export default function HomeHeader({
  name,
  dateStr,
  isNew,
  premium,
  premiumUntil,
  reportKeys,
  holdings,
  priceMap,
  todayMove,
  when,
  lang,
}: {
  name?: string | null;
  dateStr: string;
  /** First render right after signup: greet as new. */
  isNew: boolean;
  premium: boolean;
  /** When the reader's Premium ends (null for admins and free readers). */
  premiumUntil?: string | null;
  /** A free reader's analyses this month (`user.report_keys`). */
  reportKeys?: ReportKeys | null;
  /** null while unknown, [] once we know there are none. */
  holdings: PortfolioHolding[] | null;
  priceMap: Map<string, ScoreItem>;
  todayMove: { delta: number; pct: number } | null;
  /** "today" in market hours / after the close; "last" before the open. */
  when: "today" | "last";
  lang: Lang;
}) {
  const bn = lang === "bn";
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(readShown()), []);

  const greeting = isNew ? t(lang, "welcome") : greetingForHour(bstHour(), lang);
  // Premium readers see the chip only in their last 10 days, as a reminder.
  const renew = premium ? renewWords(premiumUntil, bn) : null;
  const initial = (name ?? "").trim().charAt(0).toUpperCase() || "T";

  // The money, worked out only once the reader asks to see it.
  const money = useMemo(() => {
    if (!shown || !holdings || holdings.length === 0) return null;
    const rows = computedRows(holdings, priceMap);
    const priced = rows.filter((r) => r.current_value != null);
    if (priced.length === 0) return { value: null, since: null, grade: null };
    const value = priced.reduce((s, r) => s + (r.current_value ?? 0), 0);
    const paid = priced.reduce((s, r) => s + r.cost_basis, 0);
    const grade = priceMap.size > 0 ? analyzePortfolio(rows, priceMap, lang).grade : null;
    return { value, since: value - paid, grade };
  }, [shown, holdings, priceMap, lang]);

  const toggle = () => {
    const next = !shown;
    setShown(next);
    try {
      localStorage.setItem(SHOW_KEY, next ? "1" : "0");
    } catch {}
    trackEvent("home_money_toggle", { shown: next ? 1 : 0 });
  };

  let pill;
  if (holdings === null) {
    pill = <span className="hm-pill hm-pill--wait animate-pulse" aria-hidden />;
  } else if (holdings.length === 0) {
    pill = (
      <Link href="/portfolio" className="hm-pill">
        <span className="hm-pill-ic" aria-hidden>
          <IconPlus size={16} />
        </span>
        <span>{bn ? "আপনার শেয়ার যোগ করুন" : "Add your shares"}</span>
      </Link>
    );
  } else if (!shown) {
    pill = (
      <button type="button" className="hm-pill" onClick={toggle} aria-pressed={false}>
        <span className="hm-pill-ic" aria-hidden>
          <IconEye size={16} />
        </span>
        <span>{bn ? "পোর্টফোলিও দেখুন" : "See my portfolio"}</span>
      </button>
    );
  } else {
    const up = (todayMove?.delta ?? 0) >= 0;
    // "Last close", not "Last day": the home page says "Last day to buy" two
    // blocks lower, and শেষ দিন reads as a deadline.
    const dayWord = when === "today" ? (bn ? "আজ" : "Today") : bn ? "গত কার্যদিবসে" : "Last close";
    const since = money?.since ?? null;
    const sinceText = since != null ? signedTaka(since) : null;
    pill = (
      <div className="hm-pill hm-pill--open">
        <button
          type="button"
          className="hm-pill-ic hm-pill-eye"
          onClick={toggle}
          aria-pressed
          aria-label={bn ? "পোর্টফোলিওর মূল্য লুকান" : "Hide my portfolio value"}
        >
          <IconEyeOff size={18} />
        </button>
        <Link href="/portfolio" className="hm-pill-open">
          <span className="hm-pill-txt">
            <span className="hm-pill-l1">
              <span className="hm-pill-val nums">{money?.value != null ? takaGroup(money.value) : "—"}</span>
              {todayMove && (
                <span className={`hm-pill-day nums ${up ? "hm-pill-day--up" : "hm-pill-day--down"}`}>
                  {dayWord} {signedTaka(todayMove.delta)}
                </span>
              )}
            </span>
            {(sinceText || money?.grade) && (
              <span className="hm-pill-l2 nums">
                {sinceText &&
                  (bn ? (
                    <>
                      কেনার পর থেকে <span className={since! >= 0 ? "text-positive" : "text-negative"}>{sinceText}</span>
                    </>
                  ) : (
                    <>
                      <span className={since! >= 0 ? "text-positive" : "text-negative"}>{sinceText}</span> since you bought
                    </>
                  ))}
                {sinceText && money?.grade ? " · " : ""}
                {money?.grade ? (bn ? `গ্রেড ${money.grade}` : `Grade ${money.grade}`) : ""}
              </span>
            )}
          </span>
          <span className="hm-pill-chev" aria-hidden>
            <IconChevronRight size={18} />
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className={`hm-band ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="money">
      <div className="hm-band-in">
        <span className="hm-av" aria-hidden>
          {initial}
          {premium && (
            <span className="hm-av-crown">
              <IconCrown size={12} />
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className="hm-date">
            <span className="truncate">{dateStr}</span>
            <span className="hm-date-sep" aria-hidden />
            <MarketStatusPill compact lang={lang} className="shrink-0" />
          </p>
          <h1 className="hm-hi">
            {greeting}
            {name ? `, ${name}` : ""}
          </h1>
          {!premium ? (
            <Link href="/premium?src=home-plan" className="hm-plan" data-card="plan">
              <IconBook size={14} />
              <span className="hm-plan-txt">{planWords(reportKeys, bn)}</span>
              <IconChevronRight size={14} />
            </Link>
          ) : renew ? (
            <Link
              href="/premium?plan=yearly&src=home-plan#pay"
              className={`hm-plan hm-plan--prem ${renew.urgent ? "hm-plan--soon" : ""}`}
              data-card="plan-renew"
            >
              <IconCrown size={14} />
              <span className="hm-plan-txt">{renew.text}</span>
              <IconChevronRight size={14} />
            </Link>
          ) : null}
        </div>
        <div className="hm-pill-wrap">{pill}</div>
        <button
          type="button"
          className="hm-search"
          onClick={() => {
            trackEvent("home_search_open");
            openGlobalSearch();
          }}
        >
          <IconSearch size={18} />
          <span>{bn ? "যেকোনো ডিএসই শেয়ার খুঁজুন" : "Search any DSE share"}</span>
        </button>
      </div>
    </div>
  );
}
