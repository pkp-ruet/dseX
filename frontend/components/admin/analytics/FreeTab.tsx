"use client";

import type { AdminAnalyticsResponse, ScoreItem } from "@/lib/api";
import PeopleList from "./PeopleList";
import UsageBlock, { sourceLabel } from "./UsageBlock";
import { BarList, MetricRow, Panel } from "./widgets";
import { COLORS, GROUP_COLOR, Section, n, pctOf } from "./shared";

export default function FreeTab({
  data,
  priceMap,
  windowDays,
}: {
  data: AdminAnalyticsResponse;
  priceMap: Map<string, ScoreItem>;
  windowDays: number;
}) {
  const g = data.groups?.free;
  const f = data.free;
  if (!g || !f) {
    return <p className="text-sm text-text-muted">Deploy the backend to see free-reader behaviour.</p>;
  }
  const active = g.active.window;
  const L = f.limits;
  const I = f.interest;

  return (
    <div className="flex flex-col gap-8">
      <UsageBlock g={g} windowDays={windowDays} color={GROUP_COLOR.free} priceMap={priceMap} who="free readers" />

      <Section
        title="Limits and the Premium pitch"
        lead="Where free readers run into what Premium lifts, and how many look at it."
      >
        <MetricRow
          cols="grid-cols-2 lg:grid-cols-3"
          metrics={[
            {
              label: `At the ${L.watchlist_cap}-share watchlist limit`,
              value: n(L.at_watchlist_cap),
              accent: COLORS.watch,
              sub: `${n(L.at_watchlist_cap_active)} of them active in the last ${windowDays} days`,
            },
            {
              label: `At the ${L.alerts_cap}-alert limit`,
              value: n(L.at_alerts_cap),
              sub: "armed price alerts",
            },
            {
              label: "Free report keys this month",
              value: n(L.report_keys_used),
              sub: `used by ${n(L.report_key_users)} readers · ${L.report_keys_per_month} each a month`,
            },
            {
              label: "Opened the Premium page",
              value: n(I.visited_premium),
              accent: COLORS.primary,
              sub: `${pctOf(I.visited_premium, active)}% of ${n(active)} active · ${n(I.premium_views)} views`,
            },
            {
              label: "Turned the ৳99 offer down",
              value: n(I.offer_dismissed),
              sub: `${n(I.offer_later)} chose "remind me later"`,
            },
            {
              label: "Had Premium before",
              value: n(f.lapsed.accounts),
              sub: `${n(f.lapsed.active)} active now · ${n(f.lapsed.paid_before)} had paid`,
            },
          ]}
        />
        <Panel title="Taps from pushes and nudges" note={`free readers, last ${windowDays} days`}>
          <BarList
            color={GROUP_COLOR.free}
            emptyText="No tagged taps in this window."
            items={I.taps.map((s) => ({ key: s.src, label: sourceLabel(s.src), value: s.views, secondary: `${n(s.users)} readers` }))}
          />
        </Panel>
      </Section>

      <Section
        title="Most engaged free readers"
        note={`top ${n(f.leads.length)} by days active, last ${windowDays} days`}
        lead="The free readers who use the site most: the likeliest to buy, and the ones to ask what would make Premium worth it."
      >
        <Panel>
          <PeopleList rows={f.leads} kind="leads" windowDays={windowDays} />
        </Panel>
      </Section>
    </div>
  );
}
