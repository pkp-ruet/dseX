"use client";

import { useMemo, type ReactNode } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import type { PortfolioHolding, ScoreItem } from "@/lib/api";
import { computedRows } from "@/lib/home-portfolio";
import RenewAlert from "@/components/home/personalized/RenewAlert";
import { bdGroup, takaGroup } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { bstHour, formatBstDateLabel } from "@/lib/market-hours";
import { t } from "@/lib/home-copy";
import { trackEvent } from "@/lib/track";
import { useMoneyShown } from "@/lib/home-money";
import { usePriceTime } from "@/lib/use-price-time";
import MarketStatusPill from "@/components/home/personalized/MarketStatusPill";
import { openGlobalSearch } from "@/components/layout/GlobalSearch";
import { IconChevronRight, IconEye, IconEyeOff, IconSearch } from "@/components/ui/icons";

function greetingForHour(h: number, lang: Lang): string {
  if (h < 12) return t(lang, "goodMorning");
  if (h < 17) return t(lang, "goodAfternoon");
  return t(lang, "goodEvening");
}

/** ± taka with the South-Asian grouping: "+৳12,300" / "−৳3,200". */
function signedTaka(v: number): string {
  return `${v >= 0 ? "+" : "−"}৳${bdGroup(Math.abs(v))}`;
}

/** A coloured ± figure inside the money card's second line. */
function Move({ v }: { v: number }) {
  return <span className={v >= 0 ? "text-positive" : "text-negative"}>{signedTaka(v)}</span>;
}

/**
 * The top of the signed-in home (2026-11-17, the bKash-style home): the date
 * and market state, the greeting, ONE card for the reader's money, and a
 * search field.
 *
 * The money card: like bKash's "see balance", the value starts hidden on a
 * new device (privacy on a shared or public phone); once the reader shows or
 * hides it, this device remembers. Shown, it reads the value, then today's
 * move and what they made since they bought; the small eye hides it again,
 * the rest opens the portfolio. "Add your shares" for a reader without a
 * portfolio.
 *
 * The search field opens the site's search (`GlobalSearch`, the same one as
 * the navbar's and the bottom bar's): looking up one share is the most common
 * reason to open the site.
 *
 * Clean pass (2026-11-25, user: "this top part of homepage is looking
 * noisy"): no avatar or crown (the navbar shows the account and the Premium
 * crown); the date line carries the price time during trading
 * ("Wed 25 Nov · Open · prices at 1:42 PM") and the blue "last updated" strip
 * is left off this page; the money card is the guest band's shape — a
 * "Your portfolio" label with a plain eye, the value, one line with the
 * figures coloured and the words muted, no tinted day pill, no filled eye
 * circle, no grade (the portfolio page's check says it); the search is a
 * soft grey field.
 */
export default function HomeHeader({
  name,
  dateStr,
  isNew,
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
  /** null while unknown, [] once we know there are none. */
  holdings: PortfolioHolding[] | null;
  priceMap: Map<string, ScoreItem>;
  todayMove: { delta: number; pct: number } | null;
  /** "today" in market hours / after the close; "last" before the open. */
  when: "today" | "last";
  lang: Lang;
}) {
  const bn = lang === "bn";
  // Shared with "Dividends coming to you" (lib/home-money.ts): one switch for the page's money.
  const [shown, setShown] = useMoneyShown();
  const priceTime = usePriceTime();

  const greeting = isNew ? t(lang, "welcome") : greetingForHour(bstHour(), lang);
  const label = bn ? "আপনার পোর্টফোলিও" : "Your portfolio";

  // The money, worked out only once the reader asks to see it.
  const money = useMemo(() => {
    if (!shown || !holdings || holdings.length === 0) return null;
    const rows = computedRows(holdings, priceMap);
    const priced = rows.filter((r) => r.current_value != null);
    if (priced.length === 0) return { value: null, since: null };
    const value = priced.reduce((s, r) => s + (r.current_value ?? 0), 0);
    const paid = priced.reduce((s, r) => s + r.cost_basis, 0);
    return { value, since: value - paid };
  }, [shown, holdings, priceMap]);

  const toggle = () => {
    const next = !shown;
    setShown(next);
    trackEvent("home_money_toggle", { shown: next ? 1 : 0 });
  };

  // During trading, which prices the page shows: "prices at 1:42 PM".
  let priceNote: string | null = null;
  if (priceTime?.kind === "today" && priceTime.time) {
    priceNote = bn ? `${priceTime.time}-এর দাম` : `prices at ${priceTime.time}`;
  } else if (priceTime?.kind === "earlier") {
    priceNote = bn
      ? `${bnDate(priceTime.date).replace(/\s\d{4}$/, "") || formatBstDateLabel(priceTime.date)}-এর দাম`
      : `prices from ${formatBstDateLabel(priceTime.date).replace(",", "")}`;
  }

  let card;
  if (holdings === null) {
    card = <span className="hm-money hm-money--wait animate-pulse" aria-hidden />;
  } else if (holdings.length === 0) {
    card = (
      <Link href="/portfolio" className="hm-money hm-money--tap">
        <span className="hm-money-top">
          <span className="hm-money-lbl">{label}</span>
        </span>
        <span className="hm-money-row">
          <span className="hm-money-txt">
            <span className="hm-money-add">{bn ? "আপনার শেয়ার যোগ করুন" : "Add your shares"}</span>
            <span className="hm-money-l2">
              {bn ? "আপনার টাকা আর তার আজকের ওঠানামা এখানে দেখবেন" : "See your money and today's move here"}
            </span>
          </span>
          <span className="hm-money-chev" aria-hidden>
            <IconChevronRight size={18} />
          </span>
        </span>
      </Link>
    );
  } else if (!shown) {
    card = (
      <button
        type="button"
        className="hm-money hm-money--tap"
        onClick={toggle}
        aria-pressed={false}
        aria-label={bn ? "পোর্টফোলিওর মূল্য দেখুন" : "Show my portfolio value"}
      >
        <span className="hm-money-top">
          <span className="hm-money-lbl">{label}</span>
          <span className="hm-money-eye" aria-hidden>
            <IconEye size={18} />
          </span>
        </span>
        <span className="hm-money-row">
          <span className="hm-money-txt">
            <span className="hm-money-val hm-money-mask" aria-hidden>
              ৳ ••••••
            </span>
            <span className="hm-money-l2">{bn ? "দেখতে ট্যাপ করুন" : "Tap to see"}</span>
          </span>
        </span>
      </button>
    );
  } else {
    const since = money?.since ?? null;
    const parts: ReactNode[] = [];
    if (todayMove) {
      // "Last close", not "Last day": the home page says "Last day to buy"
      // further down, and শেষ দিন reads as a deadline.
      parts.push(
        when === "today" ? (
          bn ? (
            <span key="d">
              আজ <Move v={todayMove.delta} />
            </span>
          ) : (
            <span key="d">
              <Move v={todayMove.delta} /> today
            </span>
          )
        ) : bn ? (
          <span key="d">
            গত কার্যদিবসে <Move v={todayMove.delta} />
          </span>
        ) : (
          <span key="d">
            <Move v={todayMove.delta} /> at the last close
          </span>
        ),
      );
    }
    if (since != null) {
      parts.push(
        bn ? (
          <span key="s">
            কেনার পর থেকে <Move v={since} />
          </span>
        ) : (
          <span key="s">
            <Move v={since} /> since you bought
          </span>
        ),
      );
    }
    card = (
      <div className="hm-money">
        <span className="hm-money-top">
          <span className="hm-money-lbl">{label}</span>
          <button
            type="button"
            className="hm-money-eye hm-money-eye--btn"
            onClick={toggle}
            aria-pressed
            aria-label={bn ? "পোর্টফোলিওর মূল্য লুকান" : "Hide my portfolio value"}
          >
            <IconEyeOff size={18} />
          </button>
        </span>
        <Link href="/portfolio" className="hm-money-row hm-money-open">
          <span className="hm-money-txt">
            <span className="hm-money-val nums">{money?.value != null ? takaGroup(money.value) : "—"}</span>
            {parts.length > 0 && (
              <span className="hm-money-l2 nums">
                {parts.map((p, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    {p}
                  </span>
                ))}
              </span>
            )}
          </span>
          <span className="hm-money-chev" aria-hidden>
            <IconChevronRight size={18} />
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className={`hm-band ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="money">
      <div className="hm-band-in">
        <div className="min-w-0">
          <p className="hm-date">
            <span>{dateStr}</span>
            <MarketStatusPill compact lang={lang} className="shrink-0" />
            {priceNote && <span>· {priceNote}</span>}
          </p>
          <h1 className="hm-hi">
            {greeting}
            {name ? `, ${name}` : ""}
          </h1>
          <RenewAlert lang={lang} />
        </div>
        <div className="hm-money-wrap">{card}</div>
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
