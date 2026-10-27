"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGetForYou, type ForYouItem } from "@/lib/api";
import { addToWatchlist, getCachedWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { taka } from "@/lib/formatters";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

interface Props {
  /** Tighter top spacing + no heading when embedded in another card (homepage first-run). */
  compact?: boolean;
  /** Called after a stock is added (lets a parent collapse/celebrate). */
  onAdded?: () => void;
}

const SUGGEST_COUNT = 6;

const ICON_PLUS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const ICON_CHECK = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/**
 * Empty-watchlist on-ramp. Instead of a "blind" bulk add (one tap dumping five
 * unseen tickers into the list), we surface the recommendation engine's picks
 * (2026-10-28: the same list as the dashboard's "Picked for you" — Buy signals
 * that pass every safety check, built from the reader's portfolio when they
 * have one) by name with the engine's one-line reason, each added one at a
 * time — so the user knows exactly what they're following and why. The
 * page/card above this always has a search box for adding any other stock.
 */
export default function EmptyStateActions({ compact = false, onAdded }: Props = {}) {
  const [picks, setPicks] = useState<ForYouItem[] | null>(null);
  const [watched, setWatched] = useState<string[]>([]);
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);

  useEffect(() => {
    let cancelled = false;
    apiGetForYou()
      .then((r) => {
        if (!cancelled) setPicks(r.items);
      })
      .catch(() => !cancelled && setPicks([]));
    setWatched(getCachedWatchlist());
    const off = subscribeWatchlist(() => setWatched(getCachedWatchlist()));
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const suggestions = (picks ?? []).slice(0, SUGGEST_COUNT);

  function handleAdd(code: string) {
    addToWatchlist(code);
    onAdded?.();
  }

  return (
    <div className={`text-left ${compact ? "mt-3" : "mt-5"}`}>
      {!compact && (
        <p className="mb-2.5 text-xs font-bold   text-text-muted">
          <T en="Suggested to follow" bn="অনুসরণ করার মতো" />
        </p>
      )}

      {picks === null ? (
        <ul className="flex flex-col gap-2" aria-busy="true" aria-label={L("Loading suggestions", "প্রস্তাব লোড হচ্ছে")}>
          {[...Array(4)].map((_, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 pl-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton width={64} height={14} />
                <Skeleton width="55%" height={12} />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton width={48} height={14} />
                <Skeleton width={36} height={12} />
              </div>
              <Skeleton width={64} height={36} rounded="999px" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2">
          {suggestions.map((it) => {
            const code = it.code.toUpperCase();
            const isWatched = watched.includes(code);
            const chg = it.change_pct;
            const chgClass =
              chg == null || chg === 0
                ? "text-text-muted"
                : chg > 0
                  ? "text-positive"
                  : "text-negative";
            return (
              <li
                key={code}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 pl-3.5 transition-all hover:border-primary/40 hover:shadow-soft"
              >
                <Link
                  href={`/stock/${code}`}
                  prefetch={false}
                  className="flex min-w-0 flex-1 flex-col"
                >
                  <span className="text-sm font-bold leading-tight text-text-main transition-colors group-hover:text-primary">
                    {code}
                  </span>
                  <span className="truncate text-xs text-text-muted">
                    {it.name ?? ""}
                  </span>
                  <span className="line-clamp-2 text-xs text-text-main">
                    {lang === "bn" ? it.why_bn : it.why_en}
                  </span>
                </Link>

                {/* Latest price + today's move */}
                <span className="flex shrink-0 flex-col items-end leading-tight">
                  <span className="text-sm font-bold tabular-nums text-text-main">
                    {taka(it.price, 1)}
                  </span>
                  <span className={`text-xs font-semibold tabular-nums ${chgClass}`}>
                    {chg == null ? "—" : `${chg > 0 ? "+" : ""}${chg.toFixed(1)}%`}
                  </span>
                </span>

                {isWatched ? (
                  <span
                    className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-positive/30 bg-positive/10 px-3 text-xs font-bold text-positive"
                    aria-label={L(`${code} added`, `${code} যোগ হয়েছে`)}
                  >
                    {ICON_CHECK}
                    <T en="Added" bn="যোগ হয়েছে" />
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAdd(code)}
                    aria-label={L(`Add ${code} to your watchlist`, `${code} ওয়াচলিস্টে যোগ করুন`)}
                    className="shrink-0"
                  >
                    {ICON_PLUS}
                    <T en="Add" bn="যোগ করুন" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
