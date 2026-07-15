"use client";

import type { AdminAnalyticsResponse } from "@/lib/api";
import GrowthChart from "./GrowthChart";
import { COLORS, SEGMENT_META, SEGMENT_ORDER } from "./shared";
import { MetricRow, Panel, FunnelBars, BarList } from "./widgets";

export default function PulseTab({ data }: { data: AdminAnalyticsResponse }) {
  const s = data.stats;
  const d = data.dau_wau_mau;

  const kpis = [
    { label: "Active today", value: d.dau.toLocaleString(), sub: "distinct users (DAU)", accent: COLORS.positive },
    { label: "Active 7d", value: d.wau.toLocaleString(), sub: "weekly actives (WAU)", accent: COLORS.primary },
    { label: "Active 30d", value: d.mau.toLocaleString(), sub: "monthly actives (MAU)", accent: COLORS.indigo },
    {
      label: "Stickiness",
      value: `${d.stickiness}%`,
      sub: "DAU ÷ MAU — how many monthlies show up daily",
      accent: COLORS.orange,
      hint: "Higher = users return more often. 20%+ is strong for a finance app.",
    },
  ];

  const glance = [
    { label: "Total users", value: s.total_users.toLocaleString(), sub: "registered accounts" },
    { label: "New today", value: s.new_today.toLocaleString(), sub: "signups", accent: COLORS.primary },
    { label: "New this week", value: s.new_this_week.toLocaleString(), sub: "signups" },
    { label: "With portfolio", value: s.with_portfolio.toLocaleString(), sub: "tracking holdings", accent: COLORS.positive },
  ];

  const a = data.activation;
  const funnel = [
    { label: "Signed up", count: a.signed_up, color: COLORS.muted },
    { label: "Came back", count: a.returned, color: COLORS.primary, hint: "Active on a later day than they joined" },
    { label: "Built a watchlist", count: a.built_watchlist, color: COLORS.indigo },
    { label: "Added a portfolio", count: a.added_portfolio, color: COLORS.positive },
    { label: "Uses a power feature", count: a.power_feature, color: COLORS.orange, hint: "Push, installed app, price alert, or AI" },
  ];

  const routes = (data.top_routes_today ?? []).map((r) => ({
    key: r.category,
    label: r.category,
    value: r.views,
    secondary: `${r.users.toLocaleString()} ${r.users === 1 ? "user" : "users"}`,
  }));

  const total = s.total_users || 1;

  return (
    <div className="flex flex-col gap-6">
      <MetricRow metrics={kpis} />
      <MetricRow metrics={glance} />

      <GrowthChart growth={data.growth} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Activation" note="% of all signed-up users">
          <FunnelBars steps={funnel} />
        </Panel>
        <Panel title="Where people went today" note="by page views">
          <BarList items={routes} color={COLORS.primary} emptyText="No activity recorded today yet." />
        </Panel>
      </div>

      {/* Engagement segment strip */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text)] mb-2">Lifecycle</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SEGMENT_ORDER.map((seg) => {
            const m = SEGMENT_META[seg];
            const count = data.segments[seg];
            return (
              <div key={seg} className="soft-card rounded-xl p-4" style={{ borderTop: `3px solid ${m.color}` }}>
                <p className="text-2xl font-bold tabular-nums nums" style={{ color: m.color }}>{count}</p>
                <p className="text-[11px] text-[var(--text-muted)] tabular-nums">{Math.round((count / total) * 100)}% of users</p>
                <p className="text-xs font-semibold text-[var(--text)] mt-1">{m.label}</p>
                <p className="text-[11px] text-[var(--text-muted)] leading-tight">{m.blurb}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
