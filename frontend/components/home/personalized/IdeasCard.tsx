"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type RecommendedStock, type DailyTip, type ScoreItem } from "@/lib/api";
import { getTier } from "@/lib/constants";
import { taka } from "@/lib/formatters";
import { getListDelta, type ListDelta } from "@/lib/daily-delta";
import TuneModal from "@/components/stock-recommendation/TuneModal";
import SignalChip from "@/components/ui/SignalChip";
import TierPill from "@/components/ui/TierPill";
import StarButton from "@/components/ui/StarButton";

const ROWS = 2;
const EMPTY_DELTA: ListDelta = { newCodes: new Set(), movedUp: new Map() };
const MEDALS = ["🥇", "🥈", "🥉"];

// Each stack owns a color so the three sections read as distinct zones.
const PICKS_ACCENT = "var(--primary)"; // clay — personalized
const BUYS_ACCENT = "var(--positive)"; // emerald — action
const TIPS_ACCENT = "#0D9488"; // teal — learn

// Per-signal identity for the daily tips (accent + emoji + short tag). Mirrors
// components/daily-tips/DailyTipItem so the homepage teaser owns its own row.
const TIP_META: Record<string, { color: string; icon: string; tag: string }> = {
  profit_growth: { color: "var(--positive)", icon: "📈", tag: "Growth" },
  profit_streak: { color: "var(--positive)", icon: "✅", tag: "Consistent" },
  dividend_yield: { color: "var(--watch)", icon: "💰", tag: "Dividend" },
  dividend_streak: { color: "var(--watch)", icon: "🔁", tag: "Payout Streak" },
  cheap_pe: { color: "var(--primary)", icon: "🏷️", tag: "Cheap vs Peers" },
  below_book: { color: "var(--primary)", icon: "📘", tag: "Below Book" },
  high_roe: { color: "var(--np-cautious)", icon: "⚙️", tag: "High Returns" },
  near_52w_low: { color: "var(--accent)", icon: "📉", tag: "Near Low" },
  rel_strength: { color: "var(--positive)", icon: "🚀", tag: "Outperforming" },
  div_catalyst: { color: "var(--tier-excellent)", icon: "🔔", tag: "Just Declared" },
};
const TIP_FALLBACK = { color: "var(--text-muted)", icon: "⭐", tag: "Pick" };

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

/* ── shared row vocabulary — one rhythm, color-coded per zone ── */

const TICKER =
  "font-mono text-[0.9rem] font-black tracking-tight text-[var(--text)] transition-colors group-hover:text-[var(--primary)]";
// `block` + `truncate` so a long reason clips with an ellipsis instead of
// overflowing sideways into the price column.
const WHY = "mt-0.5 block truncate text-[0.75rem] leading-snug text-[var(--text-muted)]";
// White badge that pops on the tinted zone; the accent colors the glyph.
const badgeStyle = (accent: string) => ({
  background: "var(--surface)",
  border: `1px solid color-mix(in srgb, ${accent} 22%, var(--border))`,
  color: accent,
});

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
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="15 7 21 7 21 13" />
  </svg>
);
const UP_ARROW = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="12" y1="19" x2="12" y2="6" />
    <polyline points="6 12 12 6 18 12" />
  </svg>
);
const BULB_SM = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M9 21h6v-1H9v1zm3-20a7 7 0 0 0-4 12.7V17h8v-3.3A7 7 0 0 0 12 1z" />
  </svg>
);
const ARROW_SM = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const TUNE = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

/** Tiny "New since your last visit" tag — same emerald across picks + buys. */
function NewTag() {
  return (
    <span
      className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.56rem] font-extrabold uppercase tracking-[0.06em]"
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
        <div className="text-[0.72rem] font-semibold" style={{ color }}>
          {chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

/** A color-coded zone: soft accent wash + a colored left spine, so each of the
 *  three idea types is instantly distinguishable. */
function GroupPanel({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-3 sm:p-3.5"
      style={{
        background: `color-mix(in srgb, ${accent} 5%, var(--surface))`,
        border: `1px solid color-mix(in srgb, ${accent} 15%, var(--border))`,
        borderLeftWidth: "3px",
        borderLeftColor: `color-mix(in srgb, ${accent} 55%, transparent)`,
      }}
    >
      {children}
    </div>
  );
}

/** One zone's header: a white icon chip + label, then optional action + an
 *  accent-tinted "See all" deep-link. */
function GroupHeader({
  icon,
  label,
  accent,
  href,
  seeAll,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  accent: string;
  href: string;
  seeAll: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2 text-[0.9rem] font-extrabold tracking-tight text-[var(--text)]">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg" style={badgeStyle(accent)} aria-hidden>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {action}
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-[0.72rem] font-bold transition hover:underline"
          style={{ color: accent }}
        >
          {seeAll}
          {ARROW_SM}
        </Link>
      </span>
    </div>
  );
}

/**
 * "Ideas for you" card — the personalized daily picks, the whole-market buy
 * signals, and the daily tips as three color-coded zones (clay = for you,
 * emerald = buy now, teal = learn). Each zone shares one clean row rhythm
 * (badge · ticker + meaningful chips · one-line why · the key number), so the
 * section is scannable in a glance yet the three idea types feel distinct.
 * Empty zones don't render.
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
  /** Watchlist ∪ holdings codes — personalizes the buys group. */
  watchCodes: string[];
}) {
  const hasPicks = picks.length > 0;
  const hasBuys = buys.length > 0;
  const hasTips = tips.length > 0;

  const newPicks = useMemo(
    () => new Set((newPickCodes ?? []).map((c) => c.toUpperCase())),
    [newPickCodes],
  );
  const watch = useMemo(() => new Set(watchCodes.map((c) => c.toUpperCase())), [watchCodes]);
  const watchBuys = useMemo(
    () => buys.filter((b) => watch.has(b.trading_code.toUpperCase())),
    [buys, watch],
  );
  const buyRows = useMemo(() => sortBuys(buys, watch).slice(0, ROWS), [buys, watch]);
  const pickRows = useMemo(() => picks.slice(0, ROWS), [picks]);

  const [tuneOpen, setTuneOpen] = useState(false);
  const [buyDelta, setBuyDelta] = useState<ListDelta>(EMPTY_DELTA);

  // "Flipped to buy since your last visit" — diff the whole buy set (stable
  // order) so the tags don't churn as the lists refresh.
  const buyKey = useMemo(
    () => sortBuys(buys, watch).map((b) => b.trading_code).join(","),
    [buys, watch],
  );
  useEffect(() => {
    if (buyKey) setBuyDelta(getListDelta("home.buysignals", buyKey.split(",")));
  }, [buyKey]);

  if (!hasPicks && !hasBuys && !hasTips) return null;

  const panels: React.ReactNode[] = [];

  /* ── Picked for you (clay) ── */
  if (hasPicks) {
    panels.push(
      <GroupPanel key="picks" accent={PICKS_ACCENT}>
        <GroupHeader
          icon={SPARKLE_SM}
          label="Picked for you"
          accent={PICKS_ACCENT}
          href="/stock-recommendation"
          seeAll={picks.length > ROWS ? `See all ${picks.length}` : "See all"}
          action={
            tuned ? (
              <button
                type="button"
                onClick={() => setTuneOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[0.68rem] font-bold text-[var(--primary)] shadow-sm transition hover:brightness-105 active:scale-95"
              >
                {TUNE}
                Tune
              </button>
            ) : undefined
          }
        />

        {!tuned && (
          <button
            type="button"
            onClick={() => setTuneOpen(true)}
            className="mb-2 flex w-full items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[var(--surface)] p-3 text-left transition hover:brightness-[0.99] active:scale-[0.99]"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
              style={{ background: "var(--primary)" }}
              aria-hidden
            >
              {SPARKLE}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.84rem] font-bold leading-tight text-[var(--text)]">
                Make these picks yours
              </span>
              <span className="block text-[0.74rem] leading-snug text-[var(--text-muted)]">
                Tell us what you like → get stocks matched to you, fresh daily.
              </span>
            </span>
            <span
              className="shrink-0 rounded-lg px-3 py-2 text-[0.74rem] font-bold text-white"
              style={{ background: "var(--primary)" }}
            >
              Personalize →
            </span>
          </button>
        )}

        <div className="space-y-1">
          {pickRows.map((p, i) => {
            const match = Math.max(0, Math.min(100, Math.round(p.match_score)));
            const why = p.reasons[0] || p.company_name || "";
            return (
              <div
                key={p.trading_code}
                className="group -mx-2 flex items-center gap-1 rounded-xl px-2 transition hover:bg-[var(--surface)] hover:shadow-sm"
              >
                <Link
                  prefetch={false}
                  href={`/stock/${p.trading_code}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-2"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[1.05rem]" style={badgeStyle(PICKS_ACCENT)} aria-hidden>
                    {MEDALS[i] ?? "⭐"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={TICKER}>{p.trading_code}</span>
                      <span className="shrink-0 text-[0.72rem] font-bold tabular-nums text-[var(--primary)]">
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
      </GroupPanel>,
    );
  }

  /* ── Buy signals today (emerald) ── */
  if (hasBuys) {
    panels.push(
      <GroupPanel key="buys" accent={BUYS_ACCENT}>
        <GroupHeader
          icon={UP_SM}
          label="Buy signals today"
          accent={BUYS_ACCENT}
          href="/buy-sell-signals"
          seeAll={`See all ${buys.length}`}
        />

        {watchBuys.length > 0 && (
          <p className="mb-2 flex items-center gap-1.5 text-[0.74rem] font-semibold leading-snug text-[var(--text-muted)]">
            <span style={{ color: "var(--gold-ink)" }} aria-hidden>★</span>
            <span>
              <b className="text-[var(--text)]">
                {watchBuys.length} {watchBuys.length === 1 ? "stock" : "stocks"}
              </b>{" "}
              {watchBuys.length === 1 ? "you follow is" : "you follow are"} a buy today
            </span>
          </p>
        )}

        <div className="space-y-1">
          {buyRows.map((item) => {
            const code = item.trading_code.toUpperCase();
            const tier = getTier(item.score);
            const fresh = buyDelta.newCodes.has(code);
            return (
              <div
                key={item.trading_code}
                className="group -mx-2 flex items-center gap-1 rounded-xl px-2 transition hover:bg-[var(--surface)] hover:shadow-sm"
              >
                <Link
                  prefetch={false}
                  href={`/stock/${item.trading_code}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-2"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={badgeStyle(BUYS_ACCENT)} aria-hidden>
                    {UP_ARROW}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={TICKER}>{item.trading_code}</span>
                      {item.score != null && <TierPill tier={tier} size="sm" />}
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
      </GroupPanel>,
    );
  }

  /* ── Daily tips (teal) ── */
  if (hasTips) {
    panels.push(
      <GroupPanel key="tips" accent={TIPS_ACCENT}>
        <GroupHeader
          icon={BULB_SM}
          label="Daily tips"
          accent={TIPS_ACCENT}
          href="/daily-tips"
          seeAll={tips.length > ROWS ? `See all ${tips.length}` : "See all"}
        />
        <div className="space-y-1">
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
                className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-[var(--surface)] hover:shadow-sm"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[1.05rem]" style={badgeStyle(meta.color)} aria-hidden>
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={TICKER}>{tip.trading_code}</span>
                    <span
                      className="shrink-0 text-[0.62rem] font-extrabold uppercase tracking-[0.07em]"
                      style={{ color: meta.color }}
                    >
                      {meta.tag}
                    </span>
                  </div>
                  <span className={WHY}>{summary}</span>
                </div>
                {metric && (
                  <span
                    className="shrink-0 rounded-md px-2 py-1 text-[0.72rem] font-bold tabular-nums"
                    style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}
                  >
                    {metric}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </GroupPanel>,
    );
  }

  return (
    <>
      <div className="space-y-3">{panels}</div>
      <TuneModal open={tuneOpen} sectors={sectors} onClose={() => setTuneOpen(false)} onComplete={onTuned} />
    </>
  );
}
