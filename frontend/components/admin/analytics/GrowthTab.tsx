"use client";

import type { AdminAnalyticsResponse } from "@/lib/api";
import StatCards, { type StatCard } from "./StatCards";
import GrowthChart from "./GrowthChart";
import DonutCard from "./DonutCard";
import { COLORS, SIGNUP_META } from "./shared";
import { Panel, FunnelBars } from "./widgets";

export default function GrowthTab({ data }: { data: AdminAnalyticsResponse }) {
  const s = data.stats;
  const cards: StatCard[] = [
    { label: "New today", value: s.new_today, accent: COLORS.primary },
    { label: "New this week", value: s.new_this_week },
    { label: "New this month", value: s.new_this_month },
    { label: "Total users", value: s.total_users },
    { label: "Active (7d)", value: s.active_last_7d, accent: COLORS.positive },
  ];

  const sourceSlices = [
    { name: SIGNUP_META.google.label, value: data.signup_source.google, color: SIGNUP_META.google.color },
    { name: SIGNUP_META.password.label, value: data.signup_source.password, color: SIGNUP_META.password.color },
  ];

  const a = data.activation;
  const funnel = [
    { label: "Signed up", count: a.signed_up, color: COLORS.muted },
    { label: "Came back", count: a.returned, color: COLORS.primary, hint: "Active on a later day than they joined" },
    { label: "Built a watchlist", count: a.built_watchlist, color: COLORS.indigo },
    { label: "Added a portfolio", count: a.added_portfolio, color: COLORS.positive },
    { label: "Uses a power feature", count: a.power_feature, color: COLORS.orange, hint: "Push, installed app, price alert, or AI" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StatCards cards={cards} />
      <GrowthChart growth={data.growth} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutCard title="How users signed up" slices={sourceSlices} />
        <Panel title="Activation milestones" note="% of all signed-up users">
          <FunnelBars steps={funnel} />
        </Panel>
      </div>
    </div>
  );
}
