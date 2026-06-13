"use client";

import type { AdminAnalyticsResponse, AdminUserRow } from "@/lib/api";
import { SEGMENT_META, SEGMENT_ORDER, fmtDate, timeAgo } from "./shared";
import Card from "@/components/ui/Card";

export default function SegmentsTab({
  data,
  onSelect,
}: {
  data: AdminAnalyticsResponse;
  onSelect: (u: AdminUserRow) => void;
}) {
  const total = data.stats.total_users || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Proportion bars */}
      <Card padding="none" className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
        {SEGMENT_ORDER.map((seg) => {
          const m = SEGMENT_META[seg];
          const count = data.segments[seg];
          const w = (count / total) * 100;
          return (
            <div key={seg}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-[var(--text)]">{m.label}</span>
                <span className="text-[var(--text-muted)] tabular-nums">
                  {count} · {w.toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${w}%`, background: m.color }} />
              </div>
            </div>
          );
        })}
      </Card>

      {/* Per-segment user columns */}
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
                      <span className="block text-[11px] text-[var(--text-muted)]">
                        joined {fmtDate(u.created_at)}
                      </span>
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0 tabular-nums">
                      {timeAgo(u.last_seen_at)}
                    </span>
                  </button>
                ))}
                {users.length > 50 && (
                  <p className="px-4 py-2 text-center text-[11px] text-[var(--text-muted)]">
                    +{users.length - 50} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
