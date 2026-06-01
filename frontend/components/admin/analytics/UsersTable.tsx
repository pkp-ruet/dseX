"use client";

import { useMemo, useState } from "react";
import type { AdminUserRow } from "@/lib/api";
import { SegmentPill, SourcePill, fmtDateTime, timeAgo } from "./shared";

type SortKey = "created_at" | "last_seen_at" | "total_visits" | "watchlist_count" | "portfolio_count";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "last_seen_at", label: "Last seen" },
  { key: "created_at", label: "Joined" },
  { key: "total_visits", label: "Visits" },
  { key: "watchlist_count", label: "Watchlist" },
  { key: "portfolio_count", label: "Portfolio" },
];

function sortVal(u: AdminUserRow, key: SortKey): number {
  if (key === "created_at" || key === "last_seen_at") {
    const v = u[key];
    return v ? new Date(v).getTime() : 0;
  }
  return u[key] ?? 0;
}

export default function UsersTable({
  users,
  onSelect,
}: {
  users: AdminUserRow[];
  onSelect: (u: AdminUserRow) => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("last_seen_at");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? users.filter(
          (u) =>
            u.email?.toLowerCase().includes(q) ||
            u.phone?.toLowerCase().includes(q) ||
            u.display_name?.toLowerCase().includes(q),
        )
      : users;
    return [...filtered].sort((a, b) => sortVal(b, sort) - sortVal(a, sort));
  }, [users, search, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search by email, phone, or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field flex-1 min-w-[12rem] max-w-sm text-sm"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-muted)]">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input-field text-sm py-1.5"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase">
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Segment</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left">Last Seen</th>
              <th className="px-4 py-3 text-right">Visits</th>
              <th className="px-4 py-3 text-right">Watch</th>
              <th className="px-4 py-3 text-right">Folio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr
                key={u.user_id}
                onClick={() => onSelect(u)}
                className="border-b border-[var(--cell-rule)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--text)]">
                    {u.display_name ?? <span className="text-[var(--text-muted)] italic">No name</span>}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[200px]">
                    {u.email ?? u.phone ?? `${u.user_id.slice(0, 8)}…`}
                  </p>
                </td>
                <td className="px-4 py-3"><SegmentPill segment={u.segment} /></td>
                <td className="px-4 py-3"><SourcePill source={u.signup_source} /></td>
                <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{fmtDateTime(u.created_at)}</td>
                <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{timeAgo(u.last_seen_at)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--text)]">{u.total_visits ?? 0}</td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--text-muted)]">{u.watchlist_count}</td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--text-muted)]">{u.portfolio_count}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-muted)]">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {rows.map((u) => (
          <button
            key={u.user_id}
            onClick={() => onSelect(u)}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-sm text-left"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text)] truncate">{u.display_name || "No name"}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{u.email ?? u.phone ?? `${u.user_id.slice(0, 8)}…`}</p>
              </div>
              <SegmentPill segment={u.segment} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
              <SourcePill source={u.signup_source} />
              <span>Seen {timeAgo(u.last_seen_at)}</span>
              <span>{u.total_visits ?? 0} visits</span>
              <span>★ {u.watchlist_count}</span>
              <span>▦ {u.portfolio_count}</span>
            </div>
          </button>
        ))}
        {rows.length === 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center text-[var(--text-muted)] text-sm">
            No users found.
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">Showing {rows.length} of {users.length} users</p>
    </div>
  );
}
