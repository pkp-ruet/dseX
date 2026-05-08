"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiAdminGetDailyPick,
  apiAdminShuffleDailyPick,
  type AdminDailyPickResponse,
  type AdminDailyPickSkip,
} from "@/lib/api";

function gradeOf(score: number | null | undefined): { letter: string; word: string; color: string } {
  if (score == null) return { letter: "?", word: "Unknown", color: "#94A3B8" };
  if (score >= 80) return { letter: "A", word: "Excellent", color: "#34D399" };
  if (score >= 70) return { letter: "B", word: "Good",      color: "#4ADE80" };
  if (score >= 60) return { letter: "C", word: "Fair",      color: "#60A5FA" };
  if (score >= 50) return { letter: "D", word: "Watch",     color: "#FBBF24" };
  return { letter: "F", word: "Avoid", color: "#F87171" };
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminDailyPickClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  const [data, setData] = useState<AdminDailyPickResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [shuffling, setShuffling] = useState(false);
  const [shuffleError, setShuffleError] = useState("");
  const [shuffleNote, setShuffleNote] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  const refetch = useCallback(() => {
    setLoadError("");
    apiAdminGetDailyPick()
      .then(setData)
      .catch((err: Error) => setLoadError(err?.message ?? "Failed to load"));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    refetch();
  }, [isAdmin, refetch]);

  async function handleShuffle() {
    setShuffling(true);
    setShuffleError("");
    setShuffleNote("");
    try {
      const res = await apiAdminShuffleDailyPick();
      setData({ pick: res.pick, skips_today: res.skips_today });
      const newCode = res.pick?.today?.trading_code;
      const skipped = res.skipped;
      setShuffleNote(
        skipped && newCode
          ? `Skipped ${skipped} → new pick: ${newCode}. Homepage cache refreshed.`
          : `New pick: ${newCode ?? "—"}. Homepage cache refreshed.`
      );
    } catch (err) {
      setShuffleError(err instanceof Error ? err.message : "Shuffle failed");
    } finally {
      setShuffling(false);
    }
  }

  if (isLoading || (!isAdmin && !loadError)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }
  if (!isAdmin) return null;

  const today = data?.pick?.today;
  const grade = gradeOf(today?.score);
  const skips: AdminDailyPickSkip[] = data?.skips_today ?? [];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      {/* Header / nav */}
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
            Admin
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] leading-tight">
            Today&apos;s Top Stock
          </h1>
        </div>
        <Link
          href="/admin/analytics"
          className="text-xs sm:text-sm text-[var(--accent)] hover:underline"
        >
          ← User Analytics
        </Link>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
          {loadError}
        </div>
      )}

      {/* Current pick card */}
      <section className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden mb-5">
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #FBBF24, #F97316)" }}
        />
        <div className="p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: "#F97316" }}>
            ★ Currently live on homepage
          </p>

          {!today && (
            <p className="text-sm text-[var(--text-muted)]">No pick yet — try a shuffle.</p>
          )}

          {today && (
            <div className="flex items-start gap-3 sm:gap-4">
              <div
                className="flex flex-col items-center justify-center min-w-[64px] sm:min-w-[80px] aspect-square rounded-2xl border-2 shrink-0"
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
                <Link
                  href={`/stock/${today.trading_code}`}
                  className="text-base sm:text-lg font-extrabold text-[var(--text)] leading-tight hover:underline"
                >
                  {today.trading_code}
                </Link>
                {today.company_name && (
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-1.5 truncate">
                    {today.company_name}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs">
                  {today.sector && (
                    <span className="px-2 py-0.5 rounded-full font-semibold border border-[var(--border)] text-[var(--text-muted)]">
                      {today.sector}
                    </span>
                  )}
                  <span className="font-bold" style={{ color: grade.color }}>
                    {Math.round(today.score ?? 0)}/100
                  </span>
                  {today.ltp != null && (
                    <span className="text-[var(--text-muted)]">৳{today.ltp.toFixed(2)}</span>
                  )}
                </div>
                {today.reasons.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1 text-xs sm:text-sm text-[var(--text)]">
                    {today.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-green-500 mt-0.5 shrink-0" aria-hidden="true">✓</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Shuffle action */}
      <section className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 mb-5">
        <h2 className="text-sm sm:text-base font-bold text-[var(--text)] mb-1">
          Don&apos;t like it? Shuffle.
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed mb-4">
          Skips the current pick and chooses the next-best candidate. A skipped
          stock won&apos;t come back today — but it can be picked again on a future
          day. The homepage cache is refreshed automatically.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleShuffle}
            disabled={shuffling || !today}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
          >
            {shuffling ? (
              <>
                <span
                  className="inline-block w-4 h-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin"
                  aria-hidden="true"
                />
                Shuffling…
              </>
            ) : (
              <>
                <span aria-hidden="true">🎲</span> Shuffle pick
              </>
            )}
          </button>
          <button
            type="button"
            onClick={refetch}
            disabled={shuffling}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {shuffleNote && (
          <p className="mt-3 text-xs sm:text-sm rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-green-400">
            {shuffleNote}
          </p>
        )}
        {shuffleError && (
          <p className="mt-3 text-xs sm:text-sm rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-400">
            {shuffleError}
          </p>
        )}
      </section>

      {/* Skip history for today */}
      <section className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-sm sm:text-base font-bold text-[var(--text)]">
            Skipped today
          </h2>
          <span className="text-[11px] sm:text-xs text-[var(--text-muted)]">
            {skips.length} {skips.length === 1 ? "stock" : "stocks"}
          </span>
        </div>

        {skips.length === 0 ? (
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            No skips yet today.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {skips.map((s) => (
              <li
                key={s.trading_code}
                className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg,#0c1117)] px-3 py-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/stock/${s.trading_code}`}
                    className="text-sm font-bold text-[var(--text)] hover:underline"
                  >
                    {s.trading_code}
                  </Link>
                  {s.company_name && (
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {s.company_name}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {s.score_when_skipped != null && (
                    <p className="text-xs font-semibold text-[var(--text)]">
                      {Math.round(s.score_when_skipped)}/100
                    </p>
                  )}
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {fmtTime(s.skipped_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-[11px] text-[var(--text-muted)] mt-3 leading-relaxed">
          Skips reset at 00:00 UTC — tomorrow these stocks are eligible again
          (subject to the standard 14-day rotation).
        </p>
      </section>
    </div>
  );
}
