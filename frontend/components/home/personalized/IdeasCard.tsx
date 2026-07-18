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

const ROWS = 2;
const TIPS_ACCENT = "#0D9488";
const POSITIVE = "var(--positive)";
const EMPTY_DELTA: ListDelta = { newCodes: new Set(), movedUp: new Map() };

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

const SPARKLE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
    <path d="M19 14l.9 2.6L22.5 18l-2.6 1.1L19 22l-.9-2.9L15.5 18l2.6-1.4L19 14z" opacity="0.6" />
  </svg>
);
const SPARKLE_SM = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
  </svg>
);
const UP_SM = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="15 7 21 7 21 13" />
  </svg>
);
const BULB_SM = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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

/** One group's mini-header: colored icon + label on the left, an optional
 *  action + a "See all" deep-link on the right. Shared by all three stacks. */
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
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5 text-[0.86rem] font-extrabold tracking-tight text-[var(--text)]">
        <span className="shrink-0" style={{ color: accent }} aria-hidden>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {action}
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-[0.72rem] font-bold text-[var(--primary)] transition hover:underline"
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
 * signals, and the daily tips shown as three stacked, always-visible groups
 * (2 rows each + a per-group "See all"). Replaces the earlier Picks / Buys /
 * Tips segmented control so nothing hides behind a tab — everything a returning
 * user might act on is scannable in one pass. Empty groups don't render.
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

  const watch = useMemo(() => new Set(watchCodes.map((c) => c.toUpperCase())), [watchCodes]);
  const watchBuys = useMemo(
    () => buys.filter((b) => watch.has(b.trading_code.toUpperCase())),
    [buys, watch],
  );
  const buyRows = useMemo(() => sortBuys(buys, watch).slice(0, ROWS), [buys, watch]);

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

  const groups: React.ReactNode[] = [];

  if (hasPicks) {
    groups.push(
      <div key="picks">
        <GroupHeader
          icon={SPARKLE_SM}
          label="Picked for you"
          accent="var(--primary)"
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
          limit={ROWS}
          compact
          newCodes={newPickCodes}
        />
      </div>,
    );
  }

  if (hasBuys) {
    groups.push(
      <div key="buys">
        <GroupHeader
          icon={UP_SM}
          label="Buy signals today"
          accent={POSITIVE}
          href="/buy-sell-signals"
          seeAll={`See all ${buys.length}`}
        />

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
      </div>,
    );
  }

  if (hasTips) {
    groups.push(
      <div key="tips">
        <GroupHeader
          icon={BULB_SM}
          label="Daily tips"
          accent={TIPS_ACCENT}
          href="/daily-tips"
          seeAll={tips.length > ROWS ? `See all ${tips.length}` : "See all"}
        />
        <div className="flex flex-col gap-2.5">
          {tips.slice(0, ROWS).map((tip) => (
            <DailyTipItem key={`${tip.category}-${tip.trading_code}`} tip={tip} compact />
          ))}
        </div>
      </div>,
    );
  }

  return (
    <>
      <section className="soft-card overflow-hidden">
        <div className="bg-[var(--surface-2)] px-4 py-4 sm:px-5">
          {groups.map((g, i) => (
            <div key={i} className={i > 0 ? "mt-4 border-t border-[var(--border)] pt-4" : undefined}>
              {g}
            </div>
          ))}
        </div>
      </section>

      <TuneModal open={tuneOpen} sectors={sectors} onClose={() => setTuneOpen(false)} onComplete={onTuned} />
    </>
  );
}
