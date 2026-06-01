"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiGetAdminAnalytics,
  getScores,
  type AdminAnalyticsResponse,
  type AdminUserRow,
  type ScoreItem,
  type ScoresResponse,
} from "@/lib/api";

import AdminTabs, { type TabKey } from "./analytics/AdminTabs";
import OverviewTab from "./analytics/OverviewTab";
import SegmentsTab from "./analytics/SegmentsTab";
import AdoptionTab from "./analytics/AdoptionTab";
import UsersTable from "./analytics/UsersTable";
import UserDrillDown from "./analytics/UserDrillDown";

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

export default function AdminAnalyticsClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [priceMap, setPriceMap] = useState<Map<string, ScoreItem>>(new Map());
  const [fetchError, setFetchError] = useState("");
  const [tab, setTab] = useState<TabKey>("overview");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    apiGetAdminAnalytics()
      .then(setData)
      .catch((err: Error) => setFetchError(err?.message ?? "Failed to load analytics"));
    getScores().then((s) => setPriceMap(flatten(s))).catch(() => {});
  }, [isAdmin]);

  if (isLoading || (!isAdmin && !fetchError)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="rank-page-header mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="rank-page-eyebrow">// ADMIN</p>
          <h1 className="rank-page-title">User Analytics</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href="/admin/scores"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors whitespace-nowrap"
          >
            Score Adjustments
          </a>
          <a
            href="/admin/daily-pick"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors whitespace-nowrap"
          >
            <span aria-hidden="true">★</span> Today&apos;s Top Stock
          </a>
        </div>
      </div>

      {fetchError && <p className="text-red-500 mb-4">{fetchError}</p>}
      {!data && !fetchError && <p className="text-[var(--text-muted)]">Loading analytics…</p>}

      {data && (
        <>
          <div className="mb-6">
            <AdminTabs active={tab} onChange={setTab} />
          </div>

          {tab === "overview" && <OverviewTab data={data} />}
          {tab === "segments" && <SegmentsTab data={data} onSelect={setSelected} />}
          {tab === "adoption" && <AdoptionTab data={data} priceMap={priceMap} />}
          {tab === "users" && <UsersTable users={data.users} onSelect={setSelected} />}
        </>
      )}

      {selected && (
        <UserDrillDown user={selected} priceMap={priceMap} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
