"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DailyPickResponse } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { isWatched, addToWatchlistSynced, subscribeWatchlist } from "@/lib/watchlist";

interface Props {
  data: DailyPickResponse;
}

function gradeOf(score: number | null): { letter: string; word: string; color: string } {
  if (score == null) return { letter: "?", word: "Unknown", color: "#94A3B8" };
  if (score >= 80) return { letter: "A", word: "Excellent", color: "#34D399" };
  if (score >= 70) return { letter: "B", word: "Good",      color: "#4ADE80" };
  if (score >= 60) return { letter: "C", word: "Fair",      color: "#60A5FA" };
  if (score >= 50) return { letter: "D", word: "Watch",     color: "#FBBF24" };
  return { letter: "F", word: "Avoid",                       color: "#F87171" };
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function chgColor(v: number | null | undefined): string {
  if (v == null) return "var(--text-muted)";
  if (v > 0) return "#34D399";
  if (v < 0) return "#F87171";
  return "var(--text-muted)";
}

function fmtPickDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const day = d.toLocaleDateString("en-GB", { day: "numeric" });
    const month = d.toLocaleDateString("en-GB", { month: "short" });
    return `${day} ${month}`;
  } catch {
    return iso;
  }
}

export default function TodaysTopStock({ data }: Props) {
  const { isLoggedIn } = useAuth();
  const { today, yesterday } = data;
  const grade = gradeOf(today.score);

  const [watched, setWatched] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setWatched(isWatched(today.trading_code));
    return subscribeWatchlist(() => setWatched(isWatched(today.trading_code)));
  }, [today.trading_code]);

  async function handleSave() {
    if (!isLoggedIn) {
      window.location.href = `/register?save=${encodeURIComponent(today.trading_code)}`;
      return;
    }
    if (watched) return;
    await addToWatchlistSynced(today.trading_code);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2200);
  }

  return (
    <section
      aria-label="Today's top stock pick"
      className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden h-full flex flex-col relative"
    >
      <div
        className="h-1 w-full"
        style={{ background: "linear-gradient(90deg, #FBBF24, #F97316)" }}
      />

      <div className="p-4 sm:p-5 md:p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: "#F97316" }}>
              ★ Today&apos;s Top Stock
            </p>
            <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] leading-relaxed">
              One stock our system likes today, picked from over 350.
            </p>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap mt-0.5">
            {fmtPickDate(today.date)}
          </span>
        </div>

        {/* Stock identity */}
        <div className="flex items-start gap-3 sm:gap-4 mb-3">
          <div
            className="flex flex-col items-center justify-center min-w-[64px] sm:min-w-[72px] aspect-square rounded-2xl border-2 shrink-0"
            style={{
              borderColor: grade.color,
              background: `${grade.color}1f`,
              color: grade.color,
            }}
          >
            <span className="text-3xl sm:text-4xl font-extrabold leading-none">{grade.letter}</span>
            <span className="text-[8px] sm:text-[9px] uppercase tracking-wider mt-0.5 font-bold">{grade.word}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base sm:text-lg font-extrabold text-[var(--text)] leading-tight truncate">
              {today.trading_code}
            </p>
            {today.company_name && (
              <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate">
                {today.company_name}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
              {today.sector && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[var(--border)] text-[var(--text-muted)]">
                  {today.sector}
                </span>
              )}
              <span className="text-xs sm:text-sm font-bold" style={{ color: grade.color }}>
                {Math.round(today.score ?? 0)}/100
              </span>
              {today.ltp != null && (
                <span className="text-xs text-[var(--text-muted)]">
                  ৳{today.ltp.toFixed(2)}
                </span>
              )}
              {today.change_pct != null && (
                <span className="text-xs font-semibold" style={{ color: chgColor(today.change_pct) }}>
                  {fmtPct(today.change_pct)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Why today */}
        {today.reasons.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg,#0c1117)] p-3 mb-3 sm:mb-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1.5">
              Why it stands out today
            </p>
            <ul className="flex flex-col gap-1.5 text-xs sm:text-sm text-[var(--text)]">
              {today.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-green-500 mt-0.5 shrink-0" aria-hidden="true">✓</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-wrap gap-2 mt-auto">
          <Link
            href={`/stock/${today.trading_code}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
          >
            See full report
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={watched}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors disabled:opacity-60 disabled:cursor-default"
          >
            {watched ? (
              <>
                <span aria-hidden="true">★</span> Saved to my list
              </>
            ) : isLoggedIn ? (
              <>
                <span aria-hidden="true">☆</span> Save to my list
              </>
            ) : (
              <>
                <span aria-hidden="true">☆</span> Save — sign up free
              </>
            )}
          </button>
        </div>

        {/* Yesterday's pick performance strip */}
        {yesterday && (
          <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2 text-xs">
            <span className="text-[var(--text-muted)]">
              Yesterday&apos;s pick:{" "}
              <Link
                href={`/stock/${yesterday.trading_code}`}
                className="font-bold text-[var(--text)] hover:underline"
              >
                {yesterday.trading_code}
              </Link>
            </span>
            <span className="flex items-center gap-2">
              {yesterday.next_day_return_pct != null && (
                <span className="font-semibold" style={{ color: chgColor(yesterday.next_day_return_pct) }}>
                  {fmtPct(yesterday.next_day_return_pct)}
                </span>
              )}
              <Link
                href="/top-picks"
                className="text-[var(--accent)] hover:underline whitespace-nowrap"
              >
                See history →
              </Link>
            </span>
          </div>
        )}

        {!yesterday && (
          <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs text-right">
            <Link
              href="/top-picks"
              className="text-[var(--accent)] hover:underline"
            >
              See pick history →
            </Link>
          </div>
        )}

        {/* Save toast */}
        {savedToast && (
          <div
            role="status"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-green-500 text-white text-xs font-semibold shadow-lg animate-[fadeUp_300ms_ease-out]"
          >
            Saved! We&apos;ll keep an eye on it.
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translate(-50%, 6px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </section>
  );
}
