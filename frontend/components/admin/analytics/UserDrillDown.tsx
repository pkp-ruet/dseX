"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  apiGetAdminUser,
  type AdminUserDetail,
  type AdminUserRow,
  type ScoreItem,
} from "@/lib/api";
import { taka } from "@/lib/formatters";
import { SegmentPill, SourcePill, FeatureBadges, fmtDateTime, fmtDate, timeAgo } from "./shared";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--text)] mt-0.5">{value}</dd>
    </div>
  );
}

export default function UserDrillDown({
  user,
  priceMap,
  onClose,
}: {
  user: AdminUserRow;
  priceMap: Map<string, ScoreItem>;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGetAdminUser(user.user_id)
      .then((d) => alive && setDetail(d))
      .catch((e: Error) => alive && setError(e?.message ?? "Failed to load user"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user.user_id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portfolio P&L from live scores LTP.
  let invested = 0;
  let value = 0;
  let hasPrice = false;
  const holdings = (detail?.portfolio ?? []).map((h) => {
    const ltp = priceMap.get(h.trading_code.toUpperCase())?.ltp ?? null;
    const cost = h.qty * h.buy_price;
    const cur = ltp != null ? h.qty * ltp : null;
    invested += cost;
    if (cur != null) { value += cur; hasPrice = true; }
    return { ...h, ltp, cost, cur, pnl: cur != null ? cur - cost : null };
  });
  const pnl = hasPrice ? value - invested : null;
  const pnlPct = pnl != null && invested > 0 ? (pnl / invested) * 100 : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg)] w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--text)] truncate">
              {user.display_name || user.email || user.phone || "User"}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <SegmentPill segment={user.segment} />
              <SourcePill source={user.signup_source} />
              <FeatureBadges user={user} />
              <span className="text-[11px] text-[var(--text-muted)] font-mono">{user.user_id.slice(0, 8)}…</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text)] text-xl leading-none p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {loading && <p className="text-sm text-[var(--text-muted)] py-6 text-center">Loading…</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {detail && (
            <>
              {/* Facts */}
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Fact label="Email" value={detail.email ?? "—"} />
                <Fact label="Phone" value={detail.phone ?? "—"} />
                <Fact label="Email verified" value={detail.email_verified ? "Yes" : "No"} />
                <Fact label="Joined" value={fmtDate(detail.created_at)} />
                <Fact label="Last login" value={fmtDateTime(detail.last_login_at)} />
                <Fact label="Last seen" value={`${timeAgo(detail.last_seen_at)}`} />
                <Fact label="Total visits" value={detail.total_visits} />
                <Fact label="Watchlist visited" value={timeAgo(detail.watchlist_last_visit_at)} />
              </dl>

              {/* Portfolio */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-[var(--text)]">Portfolio ({holdings.length})</h3>
                  {pnl != null && (
                    <span className="text-sm font-bold tabular-nums nums" style={{ color: pnl >= 0 ? "var(--positive)" : "var(--negative)" }}>
                      {pnl >= 0 ? "+" : ""}{taka(pnl, 0)} {pnlPct != null && `(${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%)`}
                    </span>
                  )}
                </div>
                {holdings.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No holdings.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="text-[var(--text-muted)] text-[10px] uppercase border-b border-[var(--border)]">
                          <th className="px-3 py-2 text-left">Code</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Buy</th>
                          <th className="px-3 py-2 text-right">LTP</th>
                          <th className="px-3 py-2 text-right">P&amp;L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((h) => (
                          <tr key={h.id} className="border-b border-[var(--cell-rule)] last:border-0">
                            <td className="px-3 py-2">
                              <Link prefetch={false} href={`/stock/${h.trading_code}`} className="font-mono font-bold text-[var(--primary)] hover:underline">
                                {h.trading_code}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums nums">{h.qty.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums nums">{taka(h.buy_price, 1)}</td>
                            <td className="px-3 py-2 text-right tabular-nums nums">{h.ltp != null ? taka(h.ltp, 1) : "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums nums font-semibold" style={{ color: h.pnl == null ? "var(--text-muted)" : h.pnl >= 0 ? "var(--positive)" : "var(--negative)" }}>
                              {h.pnl == null ? "—" : `${h.pnl >= 0 ? "+" : ""}${taka(h.pnl, 0)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Watchlist */}
              <section>
                <h3 className="text-sm font-bold text-[var(--text)] mb-2">Watchlist ({detail.watchlist.length})</h3>
                {detail.watchlist.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">Empty.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.watchlist.map((c) => (
                      <Link
                        key={c}
                        prefetch={false} href={`/stock/${c}`}
                        className="text-xs font-mono font-semibold px-2 py-1 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]"
                      >
                        {c}
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent activity */}
              <section>
                <h3 className="text-sm font-bold text-[var(--text)] mb-2">Recent page views</h3>
                {detail.recent_events.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No tracked activity yet.</p>
                ) : (
                  <div className="divide-y divide-[var(--cell-rule)] rounded-xl border border-[var(--border)]">
                    {detail.recent_events.map((e, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                        <span className="font-mono text-[var(--text)] truncate">{e.path}</span>
                        <span className="text-[var(--text-muted)] whitespace-nowrap shrink-0">
                          {e.count > 1 && <span className="mr-2">×{e.count}</span>}
                          {fmtDateTime(e.ts)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
