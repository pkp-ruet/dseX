"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ScoreItem } from "@/lib/api";
import { getTier, TIER_VAR } from "@/lib/constants";
import SignalChip from "@/components/ui/SignalChip";
import TierPill from "@/components/ui/TierPill";
import StarButton from "@/components/ui/StarButton";
import { taka } from "@/lib/formatters";
import { getListDelta, type ListDelta } from "@/lib/daily-delta";

const TEASER = 3;
const TAB_KEY = "dsex.home.buySignalsTab";
const POSITIVE = "var(--positive)";

const EMPTY_DELTA: ListDelta = { newCodes: new Set(), movedUp: new Map() };

type Tab = "all" | "strong";

const isStrong = (i: ScoreItem) => i.signal?.strength === "strong";

function readStoredTab(): Tab | null {
  try {
    const v = window.localStorage.getItem(TAB_KEY);
    return v === "all" || v === "strong" ? v : null;
  } catch {
    return null;
  }
}

/** Watchlist buys first, then Strong buys, then by fundamental score. */
function sortForTeaser(list: ScoreItem[], watch: Set<string>): ScoreItem[] {
  return [...list].sort(
    (a, b) =>
      Number(watch.has(b.trading_code.toUpperCase())) -
        Number(watch.has(a.trading_code.toUpperCase())) ||
      Number(isStrong(b)) - Number(isStrong(a)) ||
      (b.score ?? -1) - (a.score ?? -1),
  );
}

/** Home teaser for the Buy/Sell signals page — the objective, whole-market
 *  counterpart to the personalized daily picks. Reuses the scores already in
 *  the page's priceMap (no extra fetch); leads with buys on the user's
 *  watchlist/holdings, tags freshly-flipped buys "New" (per-device day diff),
 *  then links out to the full explorer. */
export default function BuySignalsCard({
  buys,
  watchCodes,
}: {
  /** Every buy signal (strong + normal), any order. */
  buys: ScoreItem[];
  /** Watchlist ∪ holdings codes (uppercase) — drives the personalization. */
  watchCodes: string[];
}) {
  const watch = useMemo(
    () => new Set(watchCodes.map((c) => c.toUpperCase())),
    [watchCodes],
  );

  const strongBuys = useMemo(() => buys.filter(isStrong), [buys]);
  const watchBuys = useMemo(
    () => buys.filter((b) => watch.has(b.trading_code.toUpperCase())),
    [buys, watch],
  );

  const [tab, setTab] = useState<Tab>("all");
  const [delta, setDelta] = useState<ListDelta>(EMPTY_DELTA);

  // Restore the last-used tab after mount (localStorage is client-only).
  useEffect(() => {
    const stored = readStoredTab();
    if (stored) setTab(stored);
  }, []);

  // "Flipped to buy since your last visit" — diff the whole buy set (stable
  // order) so the tags don't churn as the user toggles tabs.
  const buyKey = useMemo(
    () =>
      sortForTeaser(buys, watch)
        .map((b) => b.trading_code)
        .join(","),
    [buys, watch],
  );
  useEffect(() => {
    if (buyKey) setDelta(getListDelta("home.buysignals", buyKey.split(",")));
  }, [buyKey]);

  if (buys.length === 0) return null;

  const hasStrongTab = strongBuys.length > 0;
  const active: Tab = tab === "strong" && !hasStrongTab ? "all" : tab;
  const base = active === "strong" ? strongBuys : buys;
  const rows = sortForTeaser(base, watch).slice(0, TEASER);

  function switchTab(next: Tab) {
    setTab(next);
    try {
      window.localStorage.setItem(TAB_KEY, next);
    } catch {
      /* private mode */
    }
  }

  return (
    <section className="soft-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-3 py-3 sm:px-4">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
          style={{ background: POSITIVE, fontSize: 15, lineHeight: 1 }}
          aria-hidden
        >
          ▲
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.05rem] font-extrabold leading-tight tracking-tight text-[var(--text)]">
            Today&apos;s buy signals
          </h2>
          <p className="text-[0.68rem] font-semibold text-[var(--text-muted)]">
            The market&apos;s clearest buys right now
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold tabular-nums"
          style={{
            color: POSITIVE,
            background: `color-mix(in srgb, ${POSITIVE} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${POSITIVE} 26%, transparent)`,
          }}
        >
          {buys.length} buys
        </span>
        {hasStrongTab && (
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.68rem] font-extrabold tabular-nums text-white"
            style={{ background: POSITIVE }}
          >
            ★ {strongBuys.length} strong
          </span>
        )}
      </div>

      {/* All buys / Strong only toggle — only when there are strong buys */}
      {hasStrongTab && (
        <div
          role="tablist"
          aria-label="Filter buy signals"
          className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-1 mx-3 mt-3 sm:mx-4"
        >
          {(
            [
              { key: "all" as Tab, label: "All buys", count: buys.length },
              { key: "strong" as Tab, label: "Strong only", count: strongBuys.length },
            ]
          ).map(({ key, label, count }) => {
            const on = active === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => switchTab(key)}
                className="flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition active:scale-95"
                style={{
                  color: on ? "#fff" : "var(--text)",
                  background: on ? POSITIVE : "var(--surface)",
                  borderColor: on ? POSITIVE : "var(--border)",
                }}
              >
                {key === "strong" && <span aria-hidden style={{ fontSize: 9 }}>★</span>}
                <span>{label}</span>
                <span
                  className="tabular-nums"
                  style={{
                    background: on ? "rgba(255,255,255,0.24)" : `color-mix(in srgb, ${POSITIVE} 12%, transparent)`,
                    color: on ? "#fff" : POSITIVE,
                    padding: "1px 7px",
                    borderRadius: 999,
                    fontSize: "0.68rem",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Watchlist highlight — home-only personalization */}
      {watchBuys.length > 0 && (
        <div className="px-3 pt-3 sm:px-4">
          <p
            className="rounded-xl px-3 py-2 text-[0.76rem] font-semibold leading-snug"
            style={{
              color: "var(--text)",
              background: "color-mix(in srgb, var(--accent) 10%, var(--surface))",
              border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)",
            }}
          >
            <span style={{ color: "var(--accent)" }} aria-hidden>
              ★
            </span>{" "}
            <b>
              {watchBuys.length} {watchBuys.length === 1 ? "stock" : "stocks"}
            </b>{" "}
            {watchBuys.length === 1 ? "you follow is" : "you follow are"} a buy today
          </p>
        </div>
      )}

      {/* Teaser rows */}
      <div className="mt-3 divide-y divide-[var(--cell-rule)] border-t border-[var(--border)]">
        {rows.map((item) => {
          const code = item.trading_code.toUpperCase();
          const tier = getTier(item.score);
          const color = TIER_VAR[tier];
          const chg = item.change_pct;
          const chgColor =
            chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
          const onWatch = watch.has(code);
          const isNew = delta.newCodes.has(code);
          return (
            <div
              key={item.trading_code}
              className="flex items-start gap-3 border-l-[3px] px-3 py-3 transition-colors hover:bg-[var(--surface-2)] sm:px-4"
              style={{
                borderLeftColor: isStrong(item)
                  ? POSITIVE
                  : `color-mix(in srgb, ${POSITIVE} 30%, transparent)`,
              }}
            >
              <Link prefetch={false} href={`/stock/${item.trading_code}`} className="group min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  {onWatch && (
                    <span
                      title="On your watchlist"
                      aria-label="On your watchlist"
                      style={{ color: "var(--accent)", fontSize: 11, lineHeight: 1 }}
                    >
                      ★
                    </span>
                  )}
                  <span
                    className="font-mono text-[0.82rem] font-black leading-none group-hover:underline"
                    style={{ color: "var(--primary)" }}
                  >
                    {item.trading_code}
                  </span>
                  {item.score != null && <TierPill tier={tier} size="sm" />}
                  {item.signal && (
                    <SignalChip signal={item.signal.signal} strength={item.signal.strength} size="sm" />
                  )}
                  {isNew && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.06em]"
                      style={{
                        color: POSITIVE,
                        background: `color-mix(in srgb, ${POSITIVE} 14%, transparent)`,
                      }}
                    >
                      New
                    </span>
                  )}
                </span>
                {item.signal?.reason_en && (
                  <span className="mt-1 block text-[0.72rem] leading-snug text-[var(--text-muted)]">
                    {item.signal.reason_en}
                  </span>
                )}
              </Link>

              <div className="shrink-0 text-right tabular-nums">
                <span className="block text-[0.82rem] font-bold text-[var(--text)]">
                  {taka(item.ltp, item.ltp != null && item.ltp >= 100 ? 0 : 1)}
                </span>
                {chg != null && (
                  <span className="block text-[0.72rem] font-semibold" style={{ color: chgColor }}>
                    {chg >= 0 ? "+" : ""}
                    {chg.toFixed(1)}%
                  </span>
                )}
              </div>

              <StarButton code={item.trading_code} size="sm" />
            </div>
          );
        })}
      </div>

      <Link
        href="/buy-sell-signals"
        className="block border-t border-[var(--border)] px-4 py-3 text-center text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--surface-2)]"
      >
        See all {buys.length} buy signals →
      </Link>
    </section>
  );
}
