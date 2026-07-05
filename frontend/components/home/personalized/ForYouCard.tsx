"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type RecommendedStock, type DailyTip } from "@/lib/api";
import DailyPickList from "@/components/stock-recommendation/DailyPickList";
import DailyTipItem from "@/components/daily-tips/DailyTipItem";
import TuneModal from "@/components/stock-recommendation/TuneModal";

const TEASER_COUNT = 3;
const TAB_KEY = "dsex.home.forYouTab";

type Tab = "picks" | "tips";

const SPARKLE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
    <path d="M19 14l.9 2.6L22.5 18l-2.6 1.1L19 22l-.9-2.9L15.5 18l2.6-1.4L19 14z" opacity="0.6" />
  </svg>
);

const TIPS_ACCENT = "#0D9488";

const SPARKLE_SM = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
  </svg>
);
const BULB_SM = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M9 21h6v-1H9v1zm3-20a7 7 0 0 0-4 12.7V17h8v-3.3A7 7 0 0 0 12 1z" />
  </svg>
);

function readStoredTab(): Tab | null {
  try {
    const v = window.localStorage.getItem(TAB_KEY);
    return v === "picks" || v === "tips" ? v : null;
  } catch {
    return null;
  }
}

/** One "for you" card merging daily picks + daily tips behind a Picks/Tips
 *  segmented control (last tab remembered per device). Replaces the stacked
 *  DailyPicksCard + DailyTipsCard pair to cut a full level of card chrome. */
export default function ForYouCard({
  picks,
  tips,
  tuned = false,
  sectors,
  onTuned,
  newCodes,
}: {
  picks: RecommendedStock[];
  tips: DailyTip[];
  /** True only when the user took the quiz — drives the personalize nudge. */
  tuned?: boolean;
  sectors: string[];
  /** Called after the user finishes tuning so the parent can refetch picks. */
  onTuned: () => void | Promise<void>;
  /** Codes new since the user's previous feed — marks those picks "New". */
  newCodes?: string[];
}) {
  const hasPicks = picks.length > 0;
  const hasTips = tips.length > 0;
  const [tab, setTab] = useState<Tab>(hasPicks ? "picks" : "tips");
  const [tuneOpen, setTuneOpen] = useState(false);

  // Restore the last-used tab after mount (localStorage is client-only).
  useEffect(() => {
    const stored = readStoredTab();
    if (stored === "picks" && hasPicks) setTab("picks");
    else if (stored === "tips" && hasTips) setTab("tips");
  }, [hasPicks, hasTips]);

  if (!hasPicks && !hasTips) return null;

  function switchTab(next: Tab) {
    setTab(next);
    try {
      window.localStorage.setItem(TAB_KEY, next);
    } catch {
      /* private mode */
    }
  }

  const showTabs = hasPicks && hasTips;
  const active: Tab = tab === "picks" && !hasPicks ? "tips" : tab === "tips" && !hasTips ? "picks" : tab;

  // Each tab carries its own identity: icon + accent color; the active tab is a
  // solid flat fill with the count in a translucent badge.
  const tabBtn = (key: Tab, label: string, count: number, icon: React.ReactNode, accent: string) => {
    const isActive = active === key;
    return (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => switchTab(key)}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[0.8rem] font-extrabold transition active:scale-[0.98] ${
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

  return (
    <>
      <section className="soft-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 sm:px-4">
          {showTabs ? (
            <div
              role="tablist"
              aria-label="Today's picks and tips"
              className="flex min-w-0 flex-1 gap-1 rounded-xl bg-[var(--surface-2)] p-1"
            >
              {tabBtn("picks", "Picks", picks.length, SPARKLE_SM, "var(--primary)")}
              {tabBtn("tips", "Tips", tips.length, BULB_SM, TIPS_ACCENT)}
            </div>
          ) : (
            <h3 className="min-w-0 flex-1 truncate text-[0.98rem] font-extrabold tracking-tight text-[var(--text)]">
              {hasPicks ? "Picked for you today" : "Daily tips"}
            </h3>
          )}
          {tuned && (
            <button
              type="button"
              onClick={() => setTuneOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:brightness-110 active:scale-95"
              style={{ background: "var(--primary)" }}
            >
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
              Tune
            </button>
          )}
        </div>

        <div className="bg-[var(--surface-2)] px-4 py-4 sm:px-5">
          {active === "picks" ? (
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
                    <span className="block text-[0.86rem] font-bold text-[var(--text)] leading-tight">
                      Make these picks yours
                    </span>
                    <span className="block text-[0.75rem] text-[var(--text-muted)] leading-snug">
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
                limit={TEASER_COUNT}
                compact
                newCodes={newCodes}
              />

              <Link
                href="/stock-recommendation"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 text-[0.8rem] font-bold text-[var(--primary)] transition hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))]"
              >
                {picks.length > TEASER_COUNT ? `See all ${picks.length} picks` : "Open full picks"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2.5">
                {tips.slice(0, TEASER_COUNT).map((tip) => (
                  <DailyTipItem key={`${tip.category}-${tip.trading_code}`} tip={tip} compact />
                ))}
              </div>

              <Link
                href="/daily-tips"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 text-[0.8rem] font-bold text-[var(--primary)] transition hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))]"
              >
                {tips.length > TEASER_COUNT ? `See all ${tips.length} tips` : "Open all tips"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </>
          )}
        </div>
      </section>

      <TuneModal
        open={tuneOpen}
        sectors={sectors}
        onClose={() => setTuneOpen(false)}
        onComplete={onTuned}
      />
    </>
  );
}
