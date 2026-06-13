"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiAdminGetDailyPick,
  apiAdminRefreshDailyPickSlot,
  type AdminDailyPickState,
  type AdminDailyPickItem,
  type AdminDailyPickSkip,
} from "@/lib/api";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

function gradeOf(score: number | null | undefined): { letter: string; word: string; color: string } {
  if (score == null) return { letter: "?", word: "Unknown", color: "var(--ink-muted)" };
  if (score >= 80) return { letter: "A", word: "Excellent", color: "var(--positive)" };
  if (score >= 70) return { letter: "B", word: "Good",      color: "var(--np-good)" };
  if (score >= 60) return { letter: "C", word: "Fair",      color: "var(--primary)" };
  if (score >= 50) return { letter: "D", word: "Watch",     color: "var(--watch)" };
  return { letter: "F", word: "Risky", color: "var(--negative)" };
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

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function chgColor(v: number | null | undefined): string {
  if (v == null) return "var(--text-muted)";
  if (v > 0) return "var(--positive)";
  if (v < 0) return "var(--negative)";
  return "var(--text-muted)";
}

function PickCard({
  pick,
  refreshing,
  onRefresh,
}: {
  pick: AdminDailyPickItem;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const grade = gradeOf(pick.score);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 sm:p-4">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 shrink-0"
          style={{
            borderColor: grade.color,
            background: `color-mix(in srgb, ${grade.color} 12%, transparent)`,
            color: grade.color,
          }}
        >
          <span className="text-2xl sm:text-3xl font-extrabold leading-none">{grade.letter}</span>
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider mt-0.5 font-bold nums">
            {pick.score != null ? Math.round(pick.score) : "—"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <Link
              prefetch={false} href={`/stock/${pick.trading_code}`}
              className="text-base sm:text-lg font-extrabold text-[var(--text)] hover:underline truncate"
            >
              {pick.trading_code}
            </Link>
            <span
              className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap px-1.5 py-0.5 rounded-full"
              style={{
                background: pick.source === "dsef" ? "color-mix(in srgb, var(--positive) 12%, transparent)" : "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: pick.source === "dsef" ? "var(--positive)" : "var(--primary)",
              }}
            >
              Slot {pick.slot} · {pick.source_label}
            </span>
          </div>
          {pick.company_name && (
            <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate mb-1">
              {pick.company_name}
            </p>
          )}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
            {pick.sector && (
              <span className="text-[var(--text-muted)]">{pick.sector}</span>
            )}
            {pick.ltp != null && (
              <span className="text-[var(--text)] font-semibold nums">৳{pick.ltp.toFixed(2)}</span>
            )}
            {pick.change_pct != null && (
              <span className="font-bold nums" style={{ color: chgColor(pick.change_pct) }}>
                {fmtPct(pick.change_pct)}
              </span>
            )}
            {pick.return_7d_pct != null && (
              <span className="text-[10px] text-[var(--text-muted)]">
                7d:{" "}
                <span className="font-semibold nums" style={{ color: chgColor(pick.return_7d_pct) }}>
                  {fmtPct(pick.return_7d_pct)}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {pick.reasons.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs sm:text-sm text-[var(--text)] mb-3">
          {pick.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 leading-relaxed">
              <span className="text-[var(--positive)] mt-0.5 shrink-0 font-bold" aria-hidden="true">✓</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="ghost"
        onClick={onRefresh}
        disabled={refreshing}
        className="w-full gap-2"
      >
        {refreshing ? (
          <>
            <span
              className="inline-block w-4 h-4 rounded-full border-2 border-[var(--text-muted)] border-t-transparent animate-spin"
              aria-hidden="true"
            />
            Refreshing…
          </>
        ) : (
          <>
            <span aria-hidden="true">🔄</span> Refresh this pick
          </>
        )}
      </Button>
    </div>
  );
}

export default function AdminDailyPickClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  const [data, setData] = useState<AdminDailyPickState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [refreshingSlot, setRefreshingSlot] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionNote, setActionNote] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  const refetch = useCallback(() => {
    setLoadError("");
    apiAdminGetDailyPick()
      .then((d) => {
        setData(d);
        setActionError("");
      })
      .catch((err: Error) => setLoadError(err?.message ?? "Failed to load"));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    refetch();
  }, [isAdmin, refetch]);

  async function handleRefresh(slot: number) {
    setRefreshingSlot(slot);
    setActionError("");
    setActionNote("");
    try {
      const res = await apiAdminRefreshDailyPickSlot(slot);
      setData(res.state);
      setActionNote(
        res.skipped && res.new_code
          ? `Slot ${slot}: skipped ${res.skipped} → new pick ${res.new_code}. Homepage cache refreshed.`
          : `Slot ${slot}: new pick ${res.new_code ?? "—"}. Homepage cache refreshed.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshingSlot(null);
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

  const picks: AdminDailyPickItem[] = data?.picks ?? [];
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
            Today&apos;s Top Picks
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            3 stocks per day · 2 trending + 1 top quality. Refresh any pick you don&apos;t want.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={refetch}
            disabled={refreshingSlot != null}
            aria-label="Reload state"
          >
            ⟳ Reload
          </Button>
          <Link
            href="/admin/scores"
            className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap"
          >
            Scores
          </Link>
          <Link
            href="/admin/tips"
            className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap"
          >
            Tips
          </Link>
          <Link
            href="/admin/feedback"
            className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap"
          >
            Feedback
          </Link>
          <Link
            href="/admin/analytics"
            className="text-xs sm:text-sm text-[var(--accent)] hover:underline whitespace-nowrap"
          >
            ← Analytics
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border px-3 py-2.5 text-sm text-[var(--negative)]" style={{ borderColor: "color-mix(in srgb, var(--negative) 40%, transparent)", background: "color-mix(in srgb, var(--negative) 10%, transparent)" }}>
          {loadError}
        </div>
      )}

      {actionNote && (
        <div className="mb-4 rounded-lg border px-3 py-2.5 text-sm text-[var(--positive)]" style={{ borderColor: "color-mix(in srgb, var(--positive) 40%, transparent)", background: "color-mix(in srgb, var(--positive) 10%, transparent)" }}>
          {actionNote}
        </div>
      )}
      {actionError && (
        <div className="mb-4 rounded-lg border px-3 py-2.5 text-sm text-[var(--negative)]" style={{ borderColor: "color-mix(in srgb, var(--negative) 40%, transparent)", background: "color-mix(in srgb, var(--negative) 10%, transparent)" }}>
          {actionError}
        </div>
      )}

      {/* Picks */}
      <Card as="section" padding="none" className="rounded-2xl overflow-hidden mb-5">
        <div
          className="h-1.5 w-full"
          style={{ background: "linear-gradient(90deg, var(--warm-soft), var(--warm))" }}
        />
        <div className="p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: "var(--warm)" }}>
            ★ Currently live on homepage
          </p>

          {picks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No picks yet — they&apos;ll be selected automatically on the next page load.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {picks.map((p) => (
                <PickCard
                  key={p.slot}
                  pick={p}
                  refreshing={refreshingSlot === p.slot}
                  onRefresh={() => handleRefresh(p.slot)}
                />
              ))}
            </div>
          )}

          <p className="text-[11px] text-[var(--text-muted)] mt-4 leading-relaxed">
            Refreshing a pick adds it to today&apos;s skip list (won&apos;t come back today),
            picks the next-best candidate from the same source, and clears the
            homepage cache so all visitors see the change immediately.
          </p>
        </div>
      </Card>

      {/* Skip history for today */}
      <Card as="section" padding="none" className="rounded-2xl p-4 sm:p-5">
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
                className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              >
                <div className="min-w-0">
                  <Link
                    prefetch={false} href={`/stock/${s.trading_code}`}
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
                  {s.from_slot != null && (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      from slot {s.from_slot}
                    </p>
                  )}
                  {s.score_when_skipped != null && (
                    <p className="text-xs font-semibold text-[var(--text)] nums">
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
          (subject to the 14-day rotation rule).
        </p>
      </Card>
    </div>
  );
}
