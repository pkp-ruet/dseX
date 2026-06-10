"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiAdminGetDailyTips,
  apiAdminExcludeTip,
  apiAdminRestoreTip,
  type AdminDailyTipsState,
  type DailyTip,
  type AdminTipExclude,
} from "@/lib/api";

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminDailyTipsClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  const [data, setData] = useState<AdminDailyTipsState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionNote, setActionNote] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  const refetch = useCallback(() => {
    setLoadError("");
    apiAdminGetDailyTips()
      .then((d) => { setData(d); setActionError(""); })
      .catch((err: Error) => setLoadError(err?.message ?? "Failed to load"));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    refetch();
  }, [isAdmin, refetch]);

  async function handleExclude(tip: DailyTip) {
    setBusyCode(tip.trading_code);
    setActionError("");
    setActionNote("");
    try {
      const state = await apiAdminExcludeTip(tip.trading_code);
      setData(state);
      setActionNote(`Removed ${tip.trading_code} from tips. Homepage cache refreshed.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusyCode(null);
    }
  }

  async function handleRestore(code: string) {
    setBusyCode(code);
    setActionError("");
    setActionNote("");
    try {
      const state = await apiAdminRestoreTip(code);
      setData(state);
      setActionNote(`Restored ${code}. It can appear in tips again. Homepage cache refreshed.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusyCode(null);
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

  const tips: DailyTip[] = data?.tips ?? [];
  const excludes: AdminTipExclude[] = data?.excludes ?? [];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      {/* Header / nav */}
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
            Admin
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] leading-tight">
            Edit Daily Tips
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Remove any tip you don&apos;t want on the homepage. Removing a stock blacklists it from
            all future tips until you restore it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refetch}
            disabled={busyCode != null}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors disabled:opacity-60"
            aria-label="Reload"
          >
            ⟳ Reload
          </button>
          <Link href="/admin/daily-pick" className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap">
            Picks
          </Link>
          <Link href="/admin/scores" className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap">
            Scores
          </Link>
          <Link href="/admin/analytics" className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap">
            ← Analytics
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
          {loadError}
        </div>
      )}
      {actionNote && (
        <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2.5 text-sm text-green-500">
          {actionNote}
        </div>
      )}
      {actionError && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* Live tips */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden mb-5">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #4F6BD8, #60A5FA)" }} />
        <div className="p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest font-bold mb-3 text-[var(--primary)]">
            ★ Currently live on homepage · {tips.length} tips
          </p>

          {tips.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No tips yet — they&apos;ll be generated on the next page load or daily scrape.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tips.map((tip) => (
                <li
                  key={`${tip.category}-${tip.trading_code}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      prefetch={false} href={`/stock/${tip.trading_code}`}
                      className="text-sm font-bold text-[var(--text)] hover:underline"
                    >
                      {tip.trading_code}
                    </Link>
                    <p className="text-xs text-[var(--text-muted)] leading-snug mt-0.5">{tip.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExclude(tip)}
                    disabled={busyCode != null}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 border-red-500/40 text-red-500 hover:bg-red-500/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {busyCode === tip.trading_code ? "…" : "✕ Remove"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11px] text-[var(--text-muted)] mt-4 leading-relaxed">
            Removing a tip blacklists the stock, regenerates the list (a new tip fills its place), and
            clears the homepage cache so visitors see the change immediately.
          </p>
        </div>
      </section>

      {/* Excluded stocks */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-sm sm:text-base font-bold text-[var(--text)]">Excluded from tips</h2>
          <span className="text-[11px] sm:text-xs text-[var(--text-muted)]">
            {excludes.length} {excludes.length === 1 ? "stock" : "stocks"}
          </span>
        </div>

        {excludes.length === 0 ? (
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">No stocks excluded.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {excludes.map((ex) => (
              <li
                key={ex.trading_code}
                className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              >
                <div className="min-w-0">
                  <Link prefetch={false} href={`/stock/${ex.trading_code}`} className="text-sm font-bold text-[var(--text)] hover:underline">
                    {ex.trading_code}
                  </Link>
                  {ex.company_name && (
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{ex.company_name}</p>
                  )}
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {ex.updated_by ? `by ${ex.updated_by} · ` : ""}{fmtTime(ex.updated_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestore(ex.trading_code)}
                  disabled={busyCode != null}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {busyCode === ex.trading_code ? "…" : "↩ Restore"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
