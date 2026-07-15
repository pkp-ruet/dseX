"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type RecommendedStock, type DailyTip, type ScoreItem } from "@/lib/api";
import { getTier } from "@/lib/constants";
import { taka } from "@/lib/formatters";
import { getListDelta, type ListDelta } from "@/lib/daily-delta";
import DailyPickList from "@/components/stock-recommendation/DailyPickList";
import DailyTipItem from "@/components/daily-tips/DailyTipItem";
import TuneModal from "@/components/stock-recommendation/TuneModal";
import SignalChip from "@/components/ui/SignalChip";
import TierPill from "@/components/ui/TierPill";
import StarButton from "@/components/ui/StarButton";

const TEASER = 3;
const TAB_KEY = "dsex.home.ideasTab";
const TIPS_ACCENT = "#0D9488";
const POSITIVE = "var(--positive)";
const EMPTY_DELTA: ListDelta = { newCodes: new Set(), movedUp: new Map() };

type Tab = "picks" | "buys" | "tips";

const isStrong = (i: ScoreItem) => i.signal?.strength === "strong";

/** Watchlist buys first, then Strong buys, then by fundamental score. */
function sortBuys(list: ScoreItem[], watch: Set<string>): ScoreItem[] {
  return [...list].sort(
    (a, b) =>
      Number(watch.has(b.trading_code.toUpperCase())) - Number(watch.has(a.trading_code.toUpperCase())) ||
      Number(isStrong(b)) - Number(isStrong(a)) ||
      (b.score ?? -1) - (a.score ?? -1),
  );
}

function readStoredTab(): Tab | null {
  try {
    const v = window.localStorage.getItem(TAB_KEY);
    return v === "picks" || v === "buys" || v === "tips" ? v : null;
  } catch {
    return null;
  }
}

const SPARKLE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
    <path d="M19 14l.9 2.6L22.5 18l-2.6 1.1L19 22l-.9-2.9L15.5 18l2.6-1.4L19 14z" opacity="0.6" />
  </svg>
);
const SPARKLE_SM = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
  </svg>
);
const UP_SM = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="15 7 21 7 21 13" />
  </svg>
);
const BULB_SM = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M9 21h6v-1H9v1zm3-20a7 7 0 0 0-4 12.7V17h8v-3.3A7 7 0 0 0 12 1z" />
  </svg>
);
const ARROW = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const TUNE = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

/**
 * One "Ideas for you" card merging the personalized daily picks, the
 * whole-market buy signals, and the daily tips behind a Picks / Buys / Tips
 * segmented control (last tab remembered per device). Replaces the separate
 * ForYouCard + BuySignalsCard pair — one piece of chrome instead of two
 * near-identical tab+list+footer cards stacked back to back.
 */
export default function IdeasCard({
  picks,
  buys,
  tips,
  tuned = false,
  sectors,
  onTuned,
  newPickCodes,
  watchCodes,
}: {
  picks: RecommendedStock[];
  /** Every whole-market buy signal (strong + normal), any order. */
  buys: ScoreItem[];
  tips: DailyTip[];
  /** True only when the user took the quiz — drives the personalize nudge. */
  tuned?: boolean;
  sectors: string[];
  /** Called after tuning so the parent can refetch picks. */
  onTuned: () => void | Promise<void>;
  /** Codes new since the user's previous picks feed — marks those "New". */
  newPickCodes?: string[];
  /** Watchlist ∪ holdings codes — personalizes the buys tab. */
  watchCodes: string[];
}) {
  const hasPicks = picks.length > 0;
  const hasBuys = buys.length > 0;
  const hasTips = tips.length > 0;

  const watch = useMemo(() => new Set(watchCodes.map((c) => c.toUpperCase())), [watchCodes]);
  const watchBuys = useMemo(
    () => buys.filter((b) => watch.has(b.trading_code.toUpperCase())),
    [buys, watch],
  );
  const buyRows = useMemo(() => sortBuys(buys, watch).slice(0, TEASER), [buys, watch]);

  const firstTab: Tab = hasPicks ? "picks" : hasBuys ? "buys" : "tips";
  const [tab, setTab] = useState<Tab>(firstTab);
  const [tuneOpen, setTuneOpen] = useState(false);
  const [buyDelta, setBuyDelta] = useState<ListDelta>(EMPTY_DELTA);

  // Restore the last-used tab after mount (localStorage is client-only).
  useEffect(() => {
    const stored = readStoredTab();
    if (stored === "picks" && hasPicks) setTab("picks");
    else if (stored === "buys" && hasBuys) setTab("buys");
    else if (stored === "tips" && hasTips) setTab("tips");
  }, [hasPicks, hasBuys, hasTips]);

  // "Flipped to buy since your last visit" — diff the whole buy set (stable
  // order) so the tags don't churn as the user toggles tabs.
  const buyKey = useMemo(
    () => sortBuys(buys, watch).map((b) => b.trading_code).join(","),
    [buys, watch],
  );
  useEffect(() => {
    if (buyKey) setBuyDelta(getListDelta("home.buysignals", buyKey.split(",")));
  }, [buyKey]);

  if (!hasPicks && !hasBuys && !hasTips) return null;

  function switchTab(next: Tab) {
    setTab(next);
    try {
      window.localStorage.setItem(TAB_KEY, next);
    } catch {
      /* private mode */
    }
  }

  const available: Tab[] = [
    ...(hasPicks ? (["picks"] as Tab[]) : []),
    ...(hasBuys ? (["buys"] as Tab[]) : []),
    ...(hasTips ? (["tips"] as Tab[]) : []),
  ];
  const active: Tab = available.includes(tab) ? tab : firstTab;
  const showTabs = available.length > 1;

  const tabBtn = (key: Tab, label: string, count: number, icon: React.ReactNode, accent: string) => {
    const isActive = active === key;
    return (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => switchTab(key)}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[0.8rem] font-extrabold transition active:scale-[0.98] ${
          isActive
            ? "border-transparent text-white shadow-sm"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm"
        }`}
        style={isActive ? { background: accent } : undefined}
      >
        <span className="shrink-0" style={{ color: isActive ? "#fff" : accent }} aria-hidden>
          {icon}
        </span>
        {label}
        <span
          className="inline-flex min-w-[1.3rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[0.64rem] font-extrabold tabular-nums leading-none"
          style={
            isActive
              ? { background: "rgba(255,255,255,0.24)", color: "#fff" }
              : { background: `color-mix(in srgb, ${accent} 13%, transparent)`, color: accent }
          }
        >
          {count}
        </span>
      </button>
    );
  };

  const footer: Record<Tab, { href: string; label: string }> = {
    picks: {
      href: "/stock-recommendation",
      label: picks.length > TEASER ? `See all ${picks.length} picks` : "Open full picks",
    },
    buys: { href: "/buy-sell-signals", label: `See all ${buys.length} buy signals` },
    tips: {
      href: "/daily-tips",
      label: tips.length > TEASER ? `See all ${tips.length} tips` : "Open all tips",
    },
  };

  const singleTitle = hasPicks ? "Picked for you today" : hasBuys ? "Today's buy signals" : "Daily tips";

  return (
    <>
      <section className="soft-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 sm:px-4">
          {showTabs ? (
            <div
              role="tablist"
              aria-label="Today's ideas"
              className="flex min-w-0 flex-1 gap-1 rounded-xl bg-[var(--surface-2)] p-1"
            >
              {hasPicks && tabBtn("picks", "Picks", picks.length, SPARKLE_SM, "var(--primary)")}
              {hasBuys && tabBtn("buys", "Buys", buys.length, UP_SM, POSITIVE)}
              {hasTips && tabBtn("tips", "Tips", tips.length, BULB_SM, TIPS_ACCENT)}
            </div>
          ) : (
            <h3 className="min-w-0 flex-1 truncate text-[0.98rem] font-extrabold tracking-tight text-[var(--text)]">
              {singleTitle}
            </h3>
          )}
          {tuned && active === "picks" && (
            <button
              type="button"
              onClick={() => setTuneOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:brightness-110 active:scale-95"
              style={{ background: "var(--primary)" }}
            >
              {TUNE}
              Tune
            </button>
          )}
        </div>

        <div className="bg-[var(--surface-2)] px-4 py-4 sm:px-5">
          {active === "picks" && (
            <>
              {!tuned && (
                <button
                  type="button"
                  onClick={() => setTuneOpen(true)}
                  className="hover-lift mb-3 flex w-full items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))] p-3.5 text-left"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
                    style={{ background: "var(--primary)" }}
                    aria-hidden
                  >
                    {SPARKLE}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.86rem] font-bold leading-tight text-[var(--text)]">
                      Make these picks yours
                    </span>
                    <span className="block text-[0.75rem] leading-snug text-[var(--text-muted)]">
                      Tell us what you like → get stocks matched to you, fresh every day.
                    </span>
                  </span>
                  <span
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[0.74rem] font-bold text-white"
                    style={{ background: "var(--primary)" }}
                  >
                    Personalize →
                  </span>
                </button>
              )}

              <DailyPickList
                key={picks.map((p) => p.trading_code).join(",")}
                initialPicks={picks}
                feedback={false}
                limit={TEASER}
                compact
                newCodes={newPickCodes}
              />
            </>
          )}

          {active === "buys" && (
            <>
              {watchBuys.length > 0 && (
                <p
                  className="mb-3 rounded-xl px-3 py-2 text-[0.76rem] font-semibold leading-snug"
                  style={{
                    color: "var(--text)",
                    background: "color-mix(in srgb, var(--accent) 10%, var(--surface))",
                    border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)",
                  }}
                >
                  <span style={{ color: "var(--accent)" }} aria-hidden>★</span>{" "}
                  <b>
                    {watchBuys.length} {watchBuys.length === 1 ? "stock" : "stocks"}
                  </b>{" "}
                  {watchBuys.length === 1 ? "you follow is" : "you follow are"} a buy today
                </p>
              )}

              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="divide-y divide-[var(--cell-rule)]">
                  {buyRows.map((item) => {
                    const code = item.trading_code.toUpperCase();
                    const tier = getTier(item.score);
                    const chg = item.change_pct;
                    const chgColor =
                      chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
                    const onWatch = watch.has(code);
                    const fresh = buyDelta.newCodes.has(code);
                    return (
                      <div
                        key={item.trading_code}
                        className="flex items-start gap-3 border-l-[3px] px-3 py-3 transition-colors hover:bg-[var(--surface-2)]"
                        style={{
                          borderLeftColor: isStrong(item)
                            ? POSITIVE
                            : `color-mix(in srgb, ${POSITIVE} 30%, transparent)`,
                        }}
                      >
                        <Link prefetch={false} href={`/stock/${item.trading_code}`} className="group min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            {onWatch && (
                              <span title="On your watchlist" aria-label="On your watchlist" style={{ color: "var(--accent)", fontSize: 11, lineHeight: 1 }}>
                                ★
                              </span>
                            )}
                            <span className="font-mono text-[0.82rem] font-black leading-none group-hover:underline" style={{ color: "var(--primary)" }}>
                              {item.trading_code}
                            </span>
                            {item.score != null && <TierPill tier={tier} size="sm" />}
                            {item.signal && (
                              <SignalChip signal={item.signal.signal} strength={item.signal.strength} size="sm" />
                            )}
                            {fresh && (
                              <span
                                className="rounded-full px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.06em]"
                                style={{ color: POSITIVE, background: `color-mix(in srgb, ${POSITIVE} 14%, transparent)` }}
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
              </div>
            </>
          )}

          {active === "tips" && (
            <div className="flex flex-col gap-2.5">
              {tips.slice(0, TEASER).map((tip) => (
                <DailyTipItem key={`${tip.category}-${tip.trading_code}`} tip={tip} compact />
              ))}
            </div>
          )}

          <Link
            href={footer[active].href}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 text-[0.8rem] font-bold text-[var(--primary)] transition hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))]"
          >
            {footer[active].label}
            {ARROW}
          </Link>
        </div>
      </section>

      <TuneModal open={tuneOpen} sectors={sectors} onClose={() => setTuneOpen(false)} onComplete={onTuned} />
    </>
  );
}
