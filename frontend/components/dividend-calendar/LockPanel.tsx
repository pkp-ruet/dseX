"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { T } from "@/components/i18n/T";
import { IconCrown, IconLock } from "@/components/ui/icons";
import { usePersonalCodesCtx } from "@/components/market-analysis/PersonalCodes";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { PAID_PLANS } from "@/lib/premium-plans";
import { areaOf, savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { Pair } from "@/components/dividend-calendar/dates";

/** The cheapest month on any plan (the yearly one: ৳1,899 / 12 ≈ ৳158). */
const FROM_MONTH = Math.min(...PAID_PLANS.map((p) => Math.round(p.amount / Math.max(1, Math.round(p.days / 30)))));

export type LockTile = { value: string; label: Pair };

/**
 * What sits behind a dividend-calendar lock, in words a reader can act on
 * (2026-10-28 — the blurred rows + "In Premium" line didn't say what Premium
 * shows). Sits under the name-hidden preview rows (`CalendarLock`).
 *
 * `full` (record dates — the page's main list): a crown "Premium" mark, a
 * headline naming what you get, one line on what the full list holds, up to
 * three counts from the hidden rows, one button, the price. `line` (the
 * other lists, the dashboard card): one sentence + a small button.
 *
 * "N of your stocks" is counted here from `codes` (the hidden rows' tickers)
 * against the page's `PersonalCodesProvider`, or passed as `mine` by a caller
 * that already knows (the dashboard). Counts only, never names.
 */
export default function LockPanel({
  variant = "line",
  title,
  sub,
  tiles = [],
  codes = [],
  mine: mineIn,
  count,
  lock,
  card = false,
}: {
  variant?: "full" | "line";
  /** full: the headline · line: the whole sentence. */
  title: Pair;
  /** full only: what the whole list holds. */
  sub?: Pair;
  /** full only: up to three counts from the hidden rows. */
  tiles?: LockTile[];
  /** The hidden rows' tickers, to count the reader's own. */
  codes?: string[];
  mine?: number;
  /** How many rows are hidden — the button says "See all N". */
  count: number;
  /** Tracking label, English ("Dividend calendar: AGMs"). */
  lock: string;
  /** line only: stands alone as its own card (between date cards). */
  card?: boolean;
}) {
  const { lang } = useLang();
  const { state } = usePremium();
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const area = areaOf(usePathname() || "/");
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  const mine = mineIn ?? new Set(codes.map((c) => c.toUpperCase()).filter((c) => portfolio.has(c) || watchlist.has(c))).size;
  const mineTile: LockTile | null =
    mine > 0 ? { value: String(mine), label: mine === 1 ? { en: "is your stock", bn: "আপনার শেয়ার" } : { en: "are your stocks", bn: "আপনার শেয়ার" } } : null;
  // Your own stocks matter most: they take the last tile.
  const shown = mineTile ? [...tiles.slice(0, 2), mineTile] : tiles.slice(0, 3);
  const mineLine: Pair | null =
    mine > 0
      ? { en: mine === 1 ? "1 is your stock" : `${mine} are your stocks`, bn: `এর ${mine}টি আপনার শেয়ার` }
      : null;

  useEffect(() => {
    const el = ref.current;
    if (!el || state === "premium" || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area, lock, state, stakes: count });
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, area, lock, count]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area, lock, state, stakes: count });
    const stakes = [
      title[lang],
      ...shown.map((t) => `${t.value} ${t.label[lang]}`),
      ...(variant === "line" && mineLine ? [mineLine[lang]] : []),
    ].slice(0, 3);
    savePremiumContext({ from: area, label: "The full dividend calendar", stakes });
  };

  if (variant === "line") {
    return (
      <div ref={ref} className={`dc-lock-line ${card ? "soft-card dc-lock-line--card" : ""}`.trim()}>
        <span className="dc-lock-line-icon" aria-hidden="true">
          <IconLock size={16} />
        </span>
        <p className="dc-lock-line-text">
          <T en={title.en} bn={title.bn} />
          {mineLine && (
            <>
              {" · "}
              <b>
                <T en={mineLine.en} bn={mineLine.bn} />
              </b>
            </>
          )}
        </p>
        <Link href={PREMIUM_PATH} prefetch={false} className="btn-quiet btn-sm dc-lock-line-btn" onClick={onTap}>
          <T en="See with Premium" bn="প্রিমিয়ামে দেখুন" />
        </Link>
      </div>
    );
  }

  return (
    <div ref={ref} className="soft-card dc-lock-panel">
      <span className="dc-promo-tag">
        <IconCrown size={14} /> Premium
      </span>
      <p className="dc-lock-head">
        <T en={title.en} bn={title.bn} />
      </p>
      {sub && (
        <p className="dc-lock-sub">
          <T en={sub.en} bn={sub.bn} />
        </p>
      )}
      {shown.length > 0 && (
        <ul className="dc-lock-tiles">
          {shown.map((t) => (
            <li key={t.label.en}>
              <span className="dc-lock-tile-n">{t.value}</span>
              <span className="dc-lock-tile-l">
                <T en={t.label.en} bn={t.label.bn} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="dc-lock-foot">
        <Link href={PREMIUM_PATH} prefetch={false} className="btn-primary dc-lock-cta" onClick={onTap}>
          <T en={`See all ${count} with Premium`} bn={`প্রিমিয়ামে সব ${count}টি দেখুন`} />
        </Link>
        <span className="dc-lock-price">
          <T en={`From ৳${FROM_MONTH} a month · no auto-renewal`} bn={`মাসে ৳${FROM_MONTH} থেকে · নিজে থেকে নবায়ন হয় না`} />
        </span>
      </div>
    </div>
  );
}
