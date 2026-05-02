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
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
        { label: "Active (7d)",    value: data.stats.active_last_7d },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="rank-page-header mb-6">
        <p className="rank-page-eyebrow">// ADMIN</p>
        <h1 className="rank-page-title">User Analytics</h1>
      </div>

      {/* Stats cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
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

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase">
                  <th className="px-4 py-3 text-left">Name / ID</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Last Login</th>
                  <th className="px-4 py-3 text-left">Last Seen</th>
                  <th className="px-4 py-3 text-right">Visits</th>
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
                      colSpan={7}
                      className="px-4 py-8 text-center text-[var(--text-muted)]"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-[var(--text-muted)] mt-3">
            Showing {filteredUsers.length} of {data.users.length} users
          </p>
        </>
      )}
    </div>
  );
}
