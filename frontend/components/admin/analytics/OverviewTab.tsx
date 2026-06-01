"use client";

import type { AdminAnalyticsResponse } from "@/lib/api";
import StatCards, { type StatCard } from "./StatCards";
import GrowthChart from "./GrowthChart";
import DonutCard from "./DonutCard";
import { COLORS, SEGMENT_META, SIGNUP_META } from "./shared";

export default function OverviewTab({ data }: { data: AdminAnalyticsResponse }) {
  const s = data.stats;
  const cards: StatCard[] = [
    { label: "Total Users", value: s.total_users },
    { label: "New Today", value: s.new_today, accent: COLORS.primary },
    { label: "New This Week", value: s.new_this_week },
    { label: "New This Month", value: s.new_this_month },
    { label: "Active Today", value: s.active_today, accent: COLORS.positive },
    { label: "Active (7d)", value: s.active_last_7d, accent: COLORS.positive },
    { label: "With Portfolio", value: s.with_portfolio },
  ];

  const adoptionSlices = [
    { name: "Watchlist + Portfolio", value: data.adoption.both, color: COLORS.positive },
    { name: "Watchlist only", value: data.adoption.watchlist_only, color: COLORS.primary },
    { name: "Portfolio only", value: data.adoption.portfolio_only, color: COLORS.indigo },
    { name: "Neither", value: data.adoption.neither, color: COLORS.muted },
  ];

  const sourceSlices = [
    { name: SIGNUP_META.google.label, value: data.signup_source.google, color: SIGNUP_META.google.color },
    { name: SIGNUP_META.password.label, value: data.signup_source.password, color: SIGNUP_META.password.color },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StatCards cards={cards} />

      <GrowthChart growth={data.growth} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DonutCard title="Feature adoption" slices={adoptionSlices} />
        <DonutCard title="How users signed up" slices={sourceSlices} />
      </div>

      {/* Segment strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["new", "active", "at_risk", "dormant"] as const).map((seg) => {
          const m = SEGMENT_META[seg];
          return (
            <div
              key={seg}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4"
              style={{ borderTop: `3px solid ${m.color}` }}
            >
              <p className="text-2xl font-bold tabular-nums" style={{ color: m.color }}>
                {data.segments[seg]}
              </p>
              <p className="text-xs font-semibold text-[var(--text)] mt-1">{m.label}</p>
              <p className="text-[11px] text-[var(--text-muted)] leading-tight">{m.blurb}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
