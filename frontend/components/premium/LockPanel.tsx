"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { T } from "@/components/i18n/T";
import { IconLock } from "@/components/ui/icons";
import { JobTag } from "@/components/premium/AnswerLock";
import type { Job } from "@/lib/premium-jobs";
import {
  PersonalCodesProvider,
  useHasPersonalCodes,
  usePersonalCodesCtx,
} from "@/components/market-analysis/PersonalCodes";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { PAID_PLANS } from "@/lib/premium-plans";
import { areaOf, savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";

export type Pair = { en: string; bn: string };
export type LockTile = { value: string; label: Pair };

/** The cheapest month on any plan (the yearly one: ৳1,899 / 12 ≈ ৳158). */
export const FROM_MONTH = Math.min(
  ...PAID_PLANS.map((p) => Math.round(p.amount / Math.max(1, Math.round(p.days / 30)))),
);

type Props = {
  variant?: "full" | "line";
  /** Which of Premium's three jobs this lock belongs to (lib/premium-jobs.ts). */
  job: Job;
  /** full: the headline · line: the whole sentence. */
  title: Pair;
  /** full only: what the whole list holds. */
  sub?: Pair;
  /** full only: up to three counts from the hidden rows. */
  tiles?: LockTile[];
  /** The hidden rows' tickers, to count the reader's own. */
  codes?: string[];
  /** The reader's own count, when the caller already knows it (the dashboard). */
  mine?: number;
  /** How many rows are hidden — the full button says "See all N". */
  count: number;
  /** Tracking label, English ("Rankings", "Dividend calendar: AGMs"). */
  lock: string;
  /** What's behind the lock, for /premium's "you came from" card
   *  ("The full ranking"); defaults to the title. */
  what?: Pair;
  /** full: the button's words (default "See all N with Premium"). */
  cta?: Pair;
  /** line only: stands alone as its own card (between cards). */
  card?: boolean;
  /** full only: sits inside a padded card, after its rows — a hairline above,
   *  no card of its own. */
  inset?: boolean;
  /** inset only: the card has no padding of its own — bring the row gutter. */
  gutter?: boolean;
  /** Where the button goes (default /premium; a page's Premium section). */
  href?: string;
};

/**
 * What sits behind a `RowLock`, in words a reader can act on (2026-10-28).
 * Sits under the name-hidden preview rows.
 *
 * `full` (a page's main list): a crown "Premium" mark, a headline naming what
 * you get, one line on what the full list holds, up to three counts from the
 * hidden rows, one button, the price. `line` (secondary lists, dashboard
 * cards): one sentence + a small button.
 *
 * "N are your stocks" is counted from `codes` (the hidden rows' tickers)
 * against the page's `PersonalCodesProvider` — the panel brings its own when
 * the page has none, so the fetch happens only for readers who see a lock —
 * or passed as `mine`. Counts only, never names.
 */
export default function LockPanel(props: Props) {
  const has = useHasPersonalCodes();
  if (!has && props.mine == null && (props.codes?.length ?? 0) > 0) {
    return (
      <PersonalCodesProvider>
        <Panel {...props} />
      </PersonalCodesProvider>
    );
  }
  return <Panel {...props} />;
}

function Panel({
  variant = "line",
  job,
  title,
  sub,
  tiles = [],
  codes = [],
  mine: mineIn,
  count,
  lock,
  what,
  cta,
  card = false,
  inset = false,
  gutter = false,
  href = PREMIUM_PATH,
}: Props) {
  const { lang } = useLang();
  const { state } = usePremium();
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const area = areaOf(usePathname() || "/");
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  const mine =
    mineIn ?? new Set(codes.map((c) => c.toUpperCase()).filter((c) => portfolio.has(c) || watchlist.has(c))).size;
  const mineTile: LockTile | null =
    mine > 0
      ? { value: String(mine), label: mine === 1 ? { en: "is your stock", bn: "আপনার শেয়ার" } : { en: "are your stocks", bn: "আপনার শেয়ার" } }
      : null;
  // Your own stocks matter most: they take the last tile.
  const shown = mineTile ? [...tiles.slice(0, 2), mineTile] : tiles.slice(0, 3);
  const mineLine: Pair | null =
    mine > 0 ? { en: mine === 1 ? "1 is your stock" : `${mine} are your stocks`, bn: `এর ${mine}টি আপনার শেয়ার` } : null;

  useEffect(() => {
    const el = ref.current;
    if (!el || state === "premium" || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area, lock, state, stakes: count, job });
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, area, lock, count, job]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area, lock, state, stakes: count, job });
    const stakes = [
      ...(what ? [title[lang]] : []),
      ...shown.map((t) => `${t.value} ${t.label[lang]}`),
      ...(variant === "line" && mineLine ? [mineLine[lang]] : []),
    ].slice(0, 3);
    savePremiumContext({ from: area, label: (what ?? title)[lang], stakes });
  };

  if (variant === "line") {
    return (
      <div ref={ref} className={`lk-line ${card ? "soft-card lk-line--card" : ""}`.trim()}>
        <span className="lk-line-icon" aria-hidden="true">
          <IconLock size={16} />
        </span>
        <p className="lk-line-text">
          <JobTag job={job} className="ans-job--inline" />
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
        <Link href={href} prefetch={false} className="btn-quiet btn-sm lk-line-btn" onClick={onTap}>
          <T en="See with Premium" bn="প্রিমিয়ামে দেখুন" />
        </Link>
      </div>
    );
  }

  const button = cta ?? { en: `See all ${count} with Premium`, bn: `প্রিমিয়ামে সব ${count}টি দেখুন` };
  return (
    <div ref={ref} className={inset ? `lk-panel lk-panel--inset ${gutter ? "lk-panel--gutter" : ""}`.trim() : "soft-card lk-panel"}>
      <JobTag job={job} className="lk-tag" />
      <p className="lk-head">
        <T en={title.en} bn={title.bn} />
      </p>
      {sub && (
        <p className="lk-sub">
          <T en={sub.en} bn={sub.bn} />
        </p>
      )}
      {shown.length > 0 && (
        <ul className="lk-tiles">
          {shown.map((t) => (
            <li key={t.label.en}>
              <span className="lk-tile-n">{t.value}</span>
              <span className="lk-tile-l">
                <T en={t.label.en} bn={t.label.bn} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="lk-foot">
        <Link href={href} prefetch={false} className="btn-primary lk-cta" onClick={onTap}>
          <T en={button.en} bn={button.bn} />
        </Link>
        <span className="lk-price">
          <T en={`From ৳${FROM_MONTH} a month · no auto-renewal`} bn={`মাসে ৳${FROM_MONTH} থেকে · নিজে থেকে নবায়ন হয় না`} />
        </span>
      </div>
    </div>
  );
}
