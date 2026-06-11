"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiAdminListScores,
  apiAdminUpsertScoreAdjustment,
  apiAdminDeleteScoreAdjustment,
  type AdminScoreRow,
} from "@/lib/api";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function clampPct(raw: string): number | null {
  const v = Number(raw);
  if (!Number.isFinite(v)) return null;
  if (v < -100 || v > 500) return null;
  return v;
}

export default function AdminScoresClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  const [rows, setRows] = useState<AdminScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [showOnlyAdjusted, setShowOnlyAdjusted] = useState(false);

  // Per-row edit state
  const [editPct, setEditPct] = useState<Record<string, string>>({});
  const [editReason, setEditReason] = useState<Record<string, string>>({});
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  const reload = () => {
    setLoading(true);
    setErr("");
    apiAdminListScores()
      .then(({ items }) => {
        setRows(items);
        // Seed edit state
        const pctMap: Record<string, string> = {};
        const reasonMap: Record<string, string> = {};
        for (const r of items) {
          pctMap[r.trading_code] = r.adjustment_pct ? String(r.adjustment_pct) : "";
          reasonMap[r.trading_code] = r.reason ?? "";
        }
        setEditPct(pctMap);
        setEditReason(reasonMap);
      })
      .catch((e: Error) => setErr(e?.message ?? "Failed to load scores"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
  };

  const handleSave = async (code: string) => {
    const raw = editPct[code] ?? "";
    if (raw === "" || raw === "0") {
      // Empty or zero => delete the adjustment if one exists
      const existed = rows.find((r) => r.trading_code === code)?.adjustment_pct ?? 0;
      if (existed === 0) {
        flashToast("No change");
        return;
      }
      await handleDelete(code);
      return;
    }
    const pct = clampPct(raw);
    if (pct === null) {
      flashToast("Invalid % (must be -100 to 500)");
      return;
    }
    setSavingCode(code);
    try {
      await apiAdminUpsertScoreAdjustment({
        trading_code: code,
        pct,
        reason: editReason[code]?.trim() || null,
      });
      flashToast(`Saved ${code}: ${pct > 0 ? "+" : ""}${pct}%`);
      reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      flashToast(msg);
    } finally {
      setSavingCode(null);
    }
  };

  const handleDelete = async (code: string) => {
    setSavingCode(code);
    try {
      await apiAdminDeleteScoreAdjustment(code);
      flashToast(`Cleared ${code}`);
      reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      flashToast(msg);
    } finally {
      setSavingCode(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (showOnlyAdjusted && !r.adjustment_pct) return false;
      if (!q) return true;
      return (
        r.trading_code.toLowerCase().includes(q) ||
        (r.company_name ?? "").toLowerCase().includes(q) ||
        (r.sector ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, showOnlyAdjusted]);

  const adjustedCount = rows.filter((r) => r.adjustment_pct).length;

  if (isLoading || (!isAdmin && !err)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-2">
      <div className="rank-page-header mb-3 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="rank-page-eyebrow">// ADMIN</p>
          <h1 className="rank-page-title">Score Adjustments</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Nudge any company&apos;s final score by a percentage. Range: −100% to +500%. Final score is always clamped to 0–100.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/analytics"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors whitespace-nowrap"
          >
            Users
          </a>
          <a
            href="/admin/daily-pick"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors whitespace-nowrap"
          >
            ★ Daily Pick
          </a>
          <a
            href="/admin/tips"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors whitespace-nowrap"
          >
            💡 Edit Tips
          </a>
          <a
            href="/admin/feedback"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors whitespace-nowrap"
          >
            💬 Feedback
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--text)]">{rows.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Total Companies</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--text)]">{adjustedCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">With Active Adjustment</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-[var(--text)]">{rows.length - adjustedCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Unmodified</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search code, name, or sector…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full max-w-sm text-sm"
        />
        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyAdjusted}
            onChange={(e) => setShowOnlyAdjusted(e.target.checked)}
          />
          Show only adjusted
        </label>
        <button
          onClick={reload}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30"
        >
          Reload
        </button>
      </div>

      {err && <p className="text-red-500 mb-4 text-sm">{err}</p>}
      {loading && rows.length === 0 && (
        <p className="text-[var(--text-muted)] text-sm mb-4">Loading scores…</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase">
              <th className="px-3 py-3 text-left">Code</th>
              <th className="px-3 py-3 text-left hidden md:table-cell">Name</th>
              <th className="px-3 py-3 text-left hidden lg:table-cell">Sector</th>
              <th className="px-3 py-3 text-right">Base</th>
              <th className="px-3 py-3 text-right">Final</th>
              <th className="px-3 py-3 text-left">Adj %</th>
              <th className="px-3 py-3 text-left hidden md:table-cell">Reason</th>
              <th className="px-3 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const code = r.trading_code;
              const isSaving = savingCode === code;
              const currentPct = r.adjustment_pct ?? 0;
              const editedPct = editPct[code] ?? "";
              const editedReason = editReason[code] ?? "";
              const dirty =
                String(currentPct || "") !== editedPct ||
                (r.reason ?? "") !== editedReason;
              const finalScore = r.score;
              const baseScore = r.base_score;
              const delta = finalScore != null && baseScore != null
                ? finalScore - baseScore
                : null;
              return (
                <tr
                  key={code}
                  className={`border-b border-[var(--cell-rule)] hover:bg-[var(--surface)] transition-colors ${currentPct ? "bg-[var(--surface)]/40" : ""}`}
                >
                  <td className="px-3 py-2 font-mono font-semibold">
                    <a href={`/stock/${code}`} className="hover:underline" target="_blank" rel="noreferrer">
                      {code}
                    </a>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-[var(--text-muted)] truncate max-w-[200px]">
                    {r.company_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell text-[var(--text-muted)] text-xs">
                    {r.sector ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-muted)]">
                    {baseScore != null ? baseScore.toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className="font-semibold text-[var(--text)]">
                      {finalScore != null ? finalScore.toFixed(1) : "—"}
                    </span>
                    {delta != null && Math.abs(delta) >= 0.05 && (
                      <span className={`ml-1 text-[10px] ${delta > 0 ? "text-green-500" : "text-red-500"}`}>
                        ({delta > 0 ? "+" : ""}{delta.toFixed(1)})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      min={-100}
                      max={500}
                      value={editedPct}
                      onChange={(e) => setEditPct({ ...editPct, [code]: e.target.value })}
                      className="input-field w-20 text-sm tabular-nums"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <input
                      type="text"
                      value={editedReason}
                      onChange={(e) => setEditReason({ ...editReason, [code]: e.target.value })}
                      className="input-field w-full max-w-[260px] text-sm"
                      placeholder="optional…"
                      maxLength={500}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={!dirty || isSaving}
                        onClick={() => handleSave(code)}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {isSaving ? "…" : "Save"}
                      </button>
                      {currentPct !== 0 && (
                        <button
                          disabled={isSaving}
                          onClick={() => handleDelete(code)}
                          className="px-2 py-1 rounded text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:bg-red-600/10 hover:text-red-500 hover:border-red-500/40 disabled:opacity-30"
                          title="Clear adjustment"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {r.updated_at && currentPct !== 0 && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {formatDate(r.updated_at)}{r.updated_by ? ` · ${r.updated_by}` : ""}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  No companies match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-3">
        Showing {filtered.length} of {rows.length}. Empty / zero = no adjustment. Cached pages may take ~30s to refresh after save.
      </p>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] px-4 py-2 rounded-xl shadow-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
