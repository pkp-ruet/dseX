"use client";

import { useEffect, useState } from "react";
import {
  apiGetAdminRetention,
  type AdminAnalyticsResponse,
  type AdminRetentionResponse,
  type AdminUserRow,
} from "@/lib/api";
import { COLORS, SEGMENT_META, SEGMENT_ORDER, fmtDate, timeAgo } from "./shared";
import { Panel, MetricRow, CohortGrid, HoursHeatmap } from "./widgets";

export default function RetentionTab({
  data,
  onSelect,
}: {
  data: AdminAnalyticsResponse;
  onSelect: (u: AdminUserRow) => void;
}) {
  const [r, setR] = useState<AdminRetentionResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    apiGetAdminRetention()
      .then((res) => alive && setR(res))
      .catch((e: Error) => alive && setError(e?.message ?? "Failed to load retention"));
    return () => { alive = false; };
  }, []);

  const total = data.stats.total_users || 1;

  const retentionTiles = r
    ? (["d1", "d7", "d30"] as const).map((k) => {
        const stat = r.new_user_retention[k];
        const days = k.slice(1);
        return {
          label: `Day ${days} retention`,
          value: `${stat.pct}%`,
          sub: `${stat.retained.toLocaleString()} of ${stat.eligible.toLocaleString()} came back`,
          accent: stat.pct >= 30 ? COLORS.positive : stat.pct >= 15 ? COLORS.orange : COLORS.negative,
        };
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* New-user retention */}
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h3 className="text-sm font-bold text-[var(--text)]">New-user retention</h3>
          <span className="text-[11px] text-[var(--text-muted)]">still active N+ days after joining</span>
        </div>
        {r ? (
          <MetricRow metrics={retentionTiles} cols="grid-cols-1 sm:grid-cols-3" />
        ) : (
          <p className="text-[var(--text-muted)] text-sm">Loading retention…</p>
        )}
        <p className="mt-2 text-[11px] text-[var(--text-muted)] leading-snug">
          Of users who joined at least N days ago, the share seen again on or after their Nth day —
          measured from tracked page views. Fills in as more history accumulates.
        </p>
      </div>

      {/* Cohort grid */}
      <Panel title="Weekly cohorts" note="% of each signup week active, by weeks since joining">
        {r ? <CohortGrid rows={r.cohort_grid} /> : <p className="py-6 text-center text-xs text-[var(--text-muted)]">Loading…</p>}
      </Panel>

      {/* Active hours */}
      <Panel
        title="When users are active"
        note="page views · Dhaka time · last 90 days"
      >
        {r ? <HoursHeatmap matrix={r.active_hours.matrix} max={r.active_hours.max} /> : <p className="py-6 text-center text-xs text-[var(--text-muted)]">Loading…</p>}
        <p className="mt-3 text-[11px] text-[var(--text-muted)] leading-snug">
          Darker = busier. Use the peak windows to time push notifications and daily emails.
        </p>
      </Panel>

      {/* Lifecycle proportion */}
      <Panel title="Lifecycle breakdown">
        <div className="flex flex-col gap-3">
          {SEGMENT_ORDER.map((seg) => {
            const m = SEGMENT_META[seg];
            const count = data.segments[seg];
            const w = (count / total) * 100;
            return (
              <div key={seg}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[var(--text)]">{m.label}</span>
                  <span className="text-[var(--text-muted)] tabular-nums">{count} · {w.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${w}%`, background: m.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Per-segment user columns — click through to re-engage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SEGMENT_ORDER.map((seg) => {
          const m = SEGMENT_META[seg];
          const users = data.users.filter((u) => u.segment === seg);
          return (
            <div key={seg} className="soft-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]" style={{ borderTop: `3px solid ${m.color}` }}>
                <h3 className="text-sm font-bold text-[var(--text)]">{m.label}</h3>
                <span className="text-xs font-semibold tabular-nums" style={{ color: m.color }}>{users.length}</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[var(--cell-rule)]">
                {users.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">No users.</p>
                )}
                {users.slice(0, 50).map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => onSelect(u)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[var(--text)] truncate">
                        {u.display_name || u.email || u.phone || "No name"}
                      </span>
                      <span className="block text-[11px] text-[var(--text-muted)]">joined {fmtDate(u.created_at)}</span>
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0 tabular-nums">{timeAgo(u.last_seen_at)}</span>
                  </button>
                ))}
                {users.length > 50 && (
                  <p className="px-4 py-2 text-center text-[11px] text-[var(--text-muted)]">+{users.length - 50} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
