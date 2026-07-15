"use client";

import type { AdminAnalyticsResponse, AdminUserRow } from "@/lib/api";
import DonutCard from "./DonutCard";
import FeatureReachCards from "./FeatureReachCards";
import { COLORS } from "./shared";
import { Panel, BarList } from "./widgets";

function userName(u: AdminUserRow): string {
  return u.display_name || u.email || u.phone || `${u.user_id.slice(0, 8)}…`;
}

export default function FeaturesTab({
  data,
  onSelect,
}: {
  data: AdminAnalyticsResponse;
  onSelect: (u: AdminUserRow) => void;
}) {
  const adoptionSlices = [
    { name: "Watchlist + Portfolio", value: data.adoption.both, color: COLORS.positive },
    { name: "Watchlist only", value: data.adoption.watchlist_only, color: COLORS.primary },
    { name: "Portfolio only", value: data.adoption.portfolio_only, color: COLORS.indigo },
    { name: "Neither", value: data.adoption.neither, color: COLORS.muted },
  ];

  const vd = data.visit_distribution;
  const VISIT_PALETTE = [COLORS.positive, COLORS.primary, COLORS.indigo, COLORS.pink, COLORS.orange];
  const visitSlices = (vd?.bands ?? []).map((band, i) => ({
    name: `${band.label} visits`,
    value: band.count,
    color: VISIT_PALETTE[i % VISIT_PALETTE.length],
  }));
  const visitCounted = visitSlices.reduce((acc, sl) => acc + sl.value, 0);
  const visitSubtitle = vd
    ? `100+ visitors · ${visitCounted.toLocaleString()} of ${vd.total_users.toLocaleString()} users` +
      (vd.under_100 ? ` · ${vd.under_100.toLocaleString()} under 100 hidden` : "")
    : "";

  const byVisits = [...data.users]
    .sort((a, b) => (b.total_visits ?? 0) - (a.total_visits ?? 0))
    .slice(0, 12)
    .map((u) => ({
      key: u.user_id,
      label: (
        <button onClick={() => onSelect(u)} className="text-left hover:underline truncate">
          {userName(u)}
        </button>
      ),
      value: u.total_visits ?? 0,
      secondary: <span className="capitalize">{u.segment.replace("_", " ")}</span>,
    }));

  const byStreak = [...data.users]
    .filter((u) => (u.current_streak ?? 0) > 0 || (u.longest_streak ?? 0) > 0)
    .sort((a, b) => (b.current_streak ?? 0) - (a.current_streak ?? 0) || (b.longest_streak ?? 0) - (a.longest_streak ?? 0))
    .slice(0, 12)
    .map((u) => ({
      key: u.user_id,
      label: (
        <button onClick={() => onSelect(u)} className="text-left hover:underline truncate">
          {userName(u)}
        </button>
      ),
      value: u.current_streak ?? 0,
      secondary: `best ${u.longest_streak ?? 0} days`,
    }));

  return (
    <div className="flex flex-col gap-6">
      {data.feature_reach && <FeatureReachCards data={data.feature_reach} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DonutCard title="Feature adoption" slices={adoptionSlices} />
        {vd && <DonutCard title="Visits per user" subtitle={visitSubtitle} slices={visitSlices} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Most active users" note="by lifetime visits">
          <BarList items={byVisits} color={COLORS.primary} valueSuffix="visits" emptyText="No visits tracked yet." />
        </Panel>
        <Panel title="Longest check-in streaks" note="consecutive-day streaks">
          <BarList items={byStreak} color={COLORS.orange} valueSuffix="days" emptyText="No streaks yet." />
        </Panel>
      </div>
    </div>
  );
}
