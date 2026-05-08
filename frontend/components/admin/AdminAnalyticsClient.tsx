"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiGetAdminAnalytics,
  type AdminAnalyticsResponse,
  type AdminUserRow,
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

export default function AdminAnalyticsClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    setFetching(true);
    apiGetAdminAnalytics()
      .then(setData)
      .catch((err: Error) => setFetchError(err?.message ?? "Failed to load analytics"))
      .finally(() => setFetching(false));
  }, [isAdmin]);

  if (isLoading || (!isAdmin && !fetchError)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  const filteredUsers: AdminUserRow[] = (data?.users ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.display_name?.toLowerCase().includes(q)
    );
  });

  const statCards = data
    ? [
        { label: "Total Users",    value: data.stats.total_users },
        { label: "New Today",      value: data.stats.new_today },
        { label: "New This Week",  value: data.stats.new_this_week },
        { label: "New This Month", value: data.stats.new_this_month },
        { label: "Active Today",   value: data.stats.active_today },
        { label: "Active (7d)",    value: data.stats.active_last_7d },
        { label: "With Portfolio", value: data.stats.with_portfolio },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="rank-page-header mb-3 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="rank-page-eyebrow">// ADMIN</p>
          <h1 className="rank-page-title">User Analytics</h1>
        </div>
        <a
          href="/admin/daily-pick"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors whitespace-nowrap"
        >
          <span aria-hidden="true">★</span> Today&apos;s Top Stock
        </a>
      </div>

      {/* Stats cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
          {statCards.map(({ label, value }) => (
            <div
              key={label}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {fetchError && <p className="text-red-500 mb-4">{fetchError}</p>}
      {fetching && !data && (
        <p className="text-[var(--text-muted)] mb-4">Loading users…</p>
      )}

      {data && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by email, phone, or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-full max-w-sm text-sm"
            />
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase">
                  <th className="px-4 py-3 text-left">Name / ID</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Last Login</th>
                  <th className="px-4 py-3 text-left">Last Seen</th>
                  <th className="px-4 py-3 text-right">Visits</th>
                  <th className="px-4 py-3 text-center">Portfolio</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.user_id}
                    className="border-b border-[var(--cell-rule)] hover:bg-[var(--surface)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text)]">
                        {u.display_name ?? (
                          <span className="text-[var(--text-muted)] italic">No name</span>
                        )}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono">
                        {u.user_id.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {u.email ?? u.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {formatDate(u.last_login_at)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {formatDate(u.last_seen_at)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text)]">
                      {u.total_visits ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.has_portfolio
                            ? "text-green-400 bg-green-400/10"
                            : "text-[var(--text-muted)] bg-[var(--border)]/40"
                        }`}
                      >
                        {u.has_portfolio ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.is_active
                            ? "text-green-400 bg-green-400/10"
                            : "text-red-400 bg-red-400/10"
                        }`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-[var(--text-muted)]"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredUsers.map((u) => (
              <div
                key={u.user_id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--text)] truncate">
                      {u.display_name ?? (
                        <span className="text-[var(--text-muted)] italic font-normal">No name</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {u.email ?? u.phone ?? "—"}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                      {u.user_id.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        u.is_active
                          ? "text-green-400 bg-green-400/10"
                          : "text-red-400 bg-red-400/10"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        u.has_portfolio
                          ? "text-green-400 bg-green-400/10"
                          : "text-[var(--text-muted)] bg-[var(--border)]/50"
                      }`}
                    >
                      Portfolio: {u.has_portfolio ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-[var(--text-muted)] uppercase tracking-wider text-[10px]">Joined</dt>
                    <dd className="text-[var(--text)] mt-0.5">{formatDate(u.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)] uppercase tracking-wider text-[10px]">Last Login</dt>
                    <dd className="text-[var(--text)] mt-0.5">{formatDate(u.last_login_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)] uppercase tracking-wider text-[10px]">Last Seen</dt>
                    <dd className="text-[var(--text)] mt-0.5">{formatDate(u.last_seen_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)] uppercase tracking-wider text-[10px]">Visits</dt>
                    <dd className="text-[var(--text)] mt-0.5 tabular-nums">{u.total_visits ?? 0}</dd>
                  </div>
                </dl>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center text-[var(--text-muted)] text-sm">
                No users found.
              </div>
            )}
          </div>

          <p className="text-xs text-[var(--text-muted)] mt-3">
            Showing {filteredUsers.length} of {data.users.length} users
          </p>
        </>
      )}
    </div>
  );
}
