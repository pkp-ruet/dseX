"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { type RecommendedStock, type DailyTip, type ScoreItem } from "@/lib/api";
import { getTier } from "@/lib/constants";
import { taka } from "@/lib/formatters";
import { getListDelta, type ListDelta } from "@/lib/daily-delta";
import TuneModal from "@/components/stock-recommendation/TuneModal";
import SignalChip from "@/components/ui/SignalChip";
import TierPill from "@/components/ui/TierPill";
import StarButton from "@/components/ui/StarButton";
import Card from "@/components/ui/Card";
import DashHeader from "@/components/home/personalized/DashHeader";
import { IconArrowUp, IconBulb, IconSparkle, IconTune } from "@/components/home/personalized/DashIcons";

const ROWS = 3;
const EMPTY_DELTA: ListDelta = { newCodes: new Set(), movedUp: new Map() };
const TAB_KEY = "dsex.home.ideasTab";

type TabKey = "picks" | "buys" | "tips";

// Each tab owns a colour so the three idea types stay distinguishable.
const PICKS_ACCENT = "var(--primary)"; // personalized
const BUYS_ACCENT = "var(--positive)"; // action
const TIPS_ACCENT = "#0D9488"; // learn

// Per-signal identity for the daily tips (accent + short tag). Mirrors
// components/daily-tips/DailyTipItem so the homepage teaser owns its own row.
const TIP_META: Record<string, { color: string; tag: string }> = {
  profit_growth: { color: "var(--positive)", tag: "Growth" },
  profit_streak: { color: "var(--positive)", tag: "Consistent" },
  dividend_yield: { color: "var(--watch)", tag: "Dividend" },
  dividend_streak: { color: "var(--watch)", tag: "Payout Streak" },
  cheap_pe: { color: "var(--primary)", tag: "Cheap vs Peers" },
  below_book: { color: "var(--primary)", tag: "Below Book" },
  high_roe: { color: "var(--np-cautious)", tag: "High Returns" },
  near_52w_low: { color: "var(--accent)", tag: "Near Low" },
  rel_strength: { color: "var(--positive)", tag: "Outperforming" },
  div_catalyst: { color: "var(--tier-excellent)", tag: "Just Declared" },
};
const TIP_FALLBACK = { color: "var(--text-muted)", tag: "Pick" };

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

function readTab(): TabKey | null {
  try {
    const v = localStorage.getItem(TAB_KEY);
    return v === "picks" || v === "buys" || v === "tips" ? v : null;
  } catch {
    return null;
  }
}

/* ── shared row vocabulary — one rhythm for all three tabs ── */

const ROW =
  "flex items-center gap-1 px-4 sm:px-5 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]";
const TICKER = "font-mono text-[0.9rem] font-black tracking-tight text-[var(--text)]";
// `block` + `truncate` so a long reason clips with an ellipsis instead of
// overflowing sideways into the price column.
const WHY = "mt-0.5 block truncate text-[0.75rem] leading-snug text-[var(--text-muted)]";

/** Tinted square that leads every row — the accent colours icon + wash. */
function Badge({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[0.9rem] font-black tabular-nums"
      style={{ color: accent, background: `color-mix(in srgb, ${accent} 11%, transparent)` }}
      aria-hidden
    >
      {children}
    </span>
  );
}

/** Tiny "New since your last visit" tag — same emerald across picks + buys. */
function NewTag() {
  return (
    <span
      className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.06em]"
      style={{ color: "var(--positive)", background: "color-mix(in srgb, var(--positive) 14%, transparent)" }}
    >
      New
    </span>
  );
}

/** Right-aligned price + today's move — shared by picks + buys. */
function PriceCell({ ltp, chg }: { ltp: number | null; chg: number | null }) {
  const color = chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
  return (
    <div className="shrink-0 text-right tabular-nums">
      <div className="text-[0.86rem] font-bold text-[var(--text)]">
        {taka(ltp, ltp != null && ltp >= 100 ? 0 : 1)}
      </div>
      {chg != null && (
        <div className="text-[0.75rem] font-semibold" style={{ color }}>
          {chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

interface Tab {
  key: TabKey;
  label: string;
  count: number;
  accent: string;
  href: string;
}

/**
 * "Ideas for you" card — the personalized daily picks, the whole-market buy
 * signals, and the daily tips as three segmented tabs inside ONE plain card
 * (the earlier cut stacked three tinted panels with medals and coloured spines,
 * which made this the heaviest block on the page). One tab shows at a time; the
 * last tab is remembered per device. Empty tabs don't render; the card renders
 * nothing when all three are empty.
 */
export default function IdeasCard({
  title,
  chips,
  picks,
  buys,
  tips,
  tuned = false,
  sectors,
  onTuned,
  newPickCodes,
  watchCodes,
}: {
  /** Card title ("Your ideas today" / "Ideas for you today"). */
  title: string;
  /** Header chips — the date + "N new" pills proving the daily refresh. */
  chips?: ReactNode;
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
  const tabs = useMemo(() => {
    const t: Tab[] = [];
    if (picks.length > 0)
      t.push({ key: "picks", label: "Picks", count: picks.length, accent: PICKS_ACCENT, href: "/stock-recommendation" });
    if (buys.length > 0)
      t.push({ key: "buys", label: "Buys", count: buys.length, accent: BUYS_ACCENT, href: "/buy-sell-signals" });
    if (tips.length > 0)
      t.push({ key: "tips", label: "Tips", count: tips.length, accent: TIPS_ACCENT, href: "/daily-tips" });
    return t;
  }, [picks.length, buys.length, tips.length]);

  // Remembered tab, but only if it's still available today; else the first one.
  const [stored, setStored] = useState<TabKey | null>(null);
  useEffect(() => setStored(readTab()), []);
  const [chosen, setChosen] = useState<TabKey | null>(null);
  const has = (k: TabKey | null): k is TabKey => !!k && tabs.some((t) => t.key === k);
  const activeKey: TabKey | null = has(chosen) ? chosen : has(stored) ? stored : tabs[0]?.key ?? null;
  const active = tabs.find((t) => t.key === activeKey);

  function pick(key: TabKey) {
    setChosen(key);
    try {
      localStorage.setItem(TAB_KEY, key);
    } catch {}
  }

  const newPicks = useMemo(() => new Set((newPickCodes ?? []).map((c) => c.toUpperCase())), [newPickCodes]);
  const watch = useMemo(() => new Set(watchCodes.map((c) => c.toUpperCase())), [watchCodes]);
  const watchBuys = useMemo(() => buys.filter((b) => watch.has(b.trading_code.toUpperCase())), [buys, watch]);
  const buyRows = useMemo(() => sortBuys(buys, watch).slice(0, ROWS), [buys, watch]);
  const pickRows = useMemo(() => picks.slice(0, ROWS), [picks]);

  const [tuneOpen, setTuneOpen] = useState(false);
  const [buyDelta, setBuyDelta] = useState<ListDelta>(EMPTY_DELTA);

  // "Flipped to buy since your last visit" — diff the whole buy set (stable
  // order) so the tags don't churn as the lists refresh.
  const buyKey = useMemo(() => sortBuys(buys, watch).map((b) => b.trading_code).join(","), [buys, watch]);
  useEffect(() => {
    if (buyKey) setBuyDelta(getListDelta("home.buysignals", buyKey.split(",")));
  }, [buyKey]);

  if (!active) return null;

  const seeAll = active.count > ROWS ? `See all ${active.count}` : "See all";

  return (
    <>
      <Card as="section" padding="none" className="overflow-hidden">
        <DashHeader
          title={title}
          chips={chips}
          right={
            <span className="flex shrink-0 items-center gap-2">
              {active.key === "picks" && tuned && (
                <button
                  type="button"
                  onClick={() => setTuneOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[0.68rem] font-bold text-[var(--primary)] transition hover:bg-[var(--surface-2)] active:scale-95"
                >
                  <IconTune size={12} />
                  Tune
                </button>
              )}
              <Link
                href={active.href}
                prefetch={false}
                className="text-xs font-semibold text-[var(--primary)] hover:underline active:opacity-70"
              >
                {seeAll} →
              </Link>
            </span>
          }
        />

        {/* Segmented control — only when there is more than one tab. */}
        {tabs.length > 1 && (
          <div
            role="tablist"
            aria-label="Idea type"
            className="mx-4 mt-3 grid gap-1 rounded-xl bg-[var(--surface-2)] p-1 sm:mx-5"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map((t) => {
              const on = t.key === active.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => pick(t.key)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[0.8rem] font-bold transition-colors ${
                    on
                      ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                      : "text-[var(--text-muted)] active:bg-[var(--surface)]"
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: t.accent, opacity: on ? 1 : 0.45 }}
                    aria-hidden
                  />
                  {t.label}
                  <span className="text-[0.68rem] font-extrabold tabular-nums" style={{ color: on ? t.accent : undefined }}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Picks ── */}
        {active.key === "picks" && (
          <div className="pt-1">
            {!tuned && (
              <button
                type="button"
                onClick={() => setTuneOpen(true)}
                className="mx-4 mt-2 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface))] p-3 text-left transition active:scale-[0.99] sm:mx-5 sm:w-[calc(100%-2.5rem)]"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
                  style={{ background: PICKS_ACCENT }}
                  aria-hidden
                >
                  <IconSparkle size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.84rem] font-bold leading-tight text-[var(--text)]">
                    Make these picks yours
                  </span>
                  <span className="block text-[0.75rem] leading-snug text-[var(--text-muted)]">
                    Tell us what you like and get stocks matched to you, fresh daily.
                  </span>
                </span>
                <span
                  className="shrink-0 rounded-lg px-3 py-2 text-[0.75rem] font-bold text-white"
                  style={{ background: PICKS_ACCENT }}
                >
                  Personalize
                </span>
              </button>
            )}
            <div className="mt-1 divide-y divide-[var(--cell-rule)]">
              {pickRows.map((p, i) => {
                const match = Math.max(0, Math.min(100, Math.round(p.match_score)));
                const why = p.reasons[0] || p.company_name || "";
                return (
                  <div key={p.trading_code} className={ROW}>
                    <Link
                      prefetch={false}
                      href={`/stock/${p.trading_code}`}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2.5"
                    >
                      <Badge accent={PICKS_ACCENT}>{i + 1}</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={TICKER}>{p.trading_code}</span>
                          <span className="shrink-0 text-[0.75rem] font-bold tabular-nums" style={{ color: PICKS_ACCENT }}>
                            {match}% match
                          </span>
                          {newPicks.has(p.trading_code.toUpperCase()) && <NewTag />}
                        </div>
                        {why && <span className={WHY}>{why}</span>}
                      </div>
                      <PriceCell ltp={p.ltp} chg={p.change_pct} />
                    </Link>
                    <StarButton code={p.trading_code} size="sm" className="shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Buys ── */}
        {active.key === "buys" && (
          <div className="pt-1">
            {watchBuys.length > 0 && (
              <p className="mx-4 mt-2 text-[0.75rem] font-semibold leading-snug text-[var(--text-muted)] sm:mx-5">
                <b className="text-[var(--text)]">
                  {watchBuys.length} {watchBuys.length === 1 ? "stock" : "stocks"}
                </b>{" "}
                {watchBuys.length === 1 ? "you follow is" : "you follow are"} a buy today
              </p>
            )}
            <div className="mt-1 divide-y divide-[var(--cell-rule)]">
              {buyRows.map((item) => {
                const code = item.trading_code.toUpperCase();
                const fresh = buyDelta.newCodes.has(code);
                return (
                  <div key={item.trading_code} className={ROW}>
                    <Link
                      prefetch={false}
                      href={`/stock/${item.trading_code}`}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2.5"
                    >
                      <Badge accent={BUYS_ACCENT}>
                        <IconArrowUp size={16} />
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={TICKER}>{item.trading_code}</span>
                          {item.score != null && <TierPill tier={getTier(item.score)} size="sm" />}
                          {item.signal && (
                            <SignalChip signal={item.signal.signal} strength={item.signal.strength} size="sm" />
                          )}
                          {fresh && <NewTag />}
                        </div>
                        {item.signal?.reason_en && <span className={WHY}>{item.signal.reason_en}</span>}
                      </div>
                      <PriceCell ltp={item.ltp} chg={item.change_pct} />
                    </Link>
                    <StarButton code={item.trading_code} size="sm" className="shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tips ── */}
        {active.key === "tips" && (
          <div className="mt-2 divide-y divide-[var(--cell-rule)]">
            {tips.slice(0, ROWS).map((tip) => {
              const meta = TIP_META[tip.category] ?? TIP_FALLBACK;
              const metric = tip.facts?.[0]?.value;
              const summary = tip.text.includes(" — ")
                ? tip.text.slice(tip.text.indexOf(" — ") + 3)
                : tip.text;
              return (
                <Link
                  key={`${tip.category}-${tip.trading_code}`}
                  prefetch={false}
                  href={`/stock/${tip.trading_code}`}
                  className={`${ROW} gap-3 py-2.5`}
                >
                  <Badge accent={meta.color}>
                    <IconBulb size={16} />
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={TICKER}>{tip.trading_code}</span>
                      <span
                        className="shrink-0 text-[0.68rem] font-extrabold uppercase tracking-[0.07em]"
                        style={{ color: meta.color }}
                      >
                        {meta.tag}
                      </span>
                    </div>
                    <span className={WHY}>{summary}</span>
                  </div>
                  {metric && (
                    <span
                      className="shrink-0 rounded-md px-2 py-1 text-[0.75rem] font-bold tabular-nums"
                      style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}
                    >
                      {metric}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </Card>
      <TuneModal open={tuneOpen} sectors={sectors} onClose={() => setTuneOpen(false)} onComplete={onTuned} />
    </>
  );
}
