"use client";

import { useEffect, useState } from "react";
import {
  apiGetAdminBehavior,
  type AdminAnalyticsResponse,
  type AdminBehaviorResponse,
  type ScoreItem,
} from "@/lib/api";
import { COLORS } from "./shared";
import { Panel, BarList, StockBarList, MetricRow } from "./widgets";

export default function BehaviorTab({
  data,
  priceMap,
}: {
  data: AdminAnalyticsResponse;
  priceMap: Map<string, ScoreItem>;
}) {
  const [b, setB] = useState<AdminBehaviorResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    apiGetAdminBehavior(30)
      .then((r) => alive && setB(r))
      .catch((e: Error) => alive && setError(e?.message ?? "Failed to load behavior"));
    return () => { alive = false; };
  }, []);

  if (error) return <p className="text-red-500 text-sm">{error}</p>;
  if (!b) return <p className="text-[var(--text-muted)] text-sm">Loading behavior…</p>;

  const context = [
    { label: "Active users", value: b.active_users.toLocaleString(), sub: `page views in last ${b.window_days}d` },
    { label: "Page views", value: b.total_views.toLocaleString(), sub: `last ${b.window_days} days` },
    {
      label: "Views / user",
      value: b.active_users ? (b.total_views / b.active_users).toFixed(1) : "—",
      sub: "engagement depth",
      accent: COLORS.primary,
    },
  ];

  const categories = b.category_mix.map((c) => ({
    key: c.category,
    label: c.category,
    value: c.views,
    secondary: `${c.users.toLocaleString()} ${c.users === 1 ? "user" : "users"}`,
  }));

  const pages = b.top_pages.map((p) => ({
    key: p.path,
    label: <span className="font-mono text-xs">{p.path}</span>,
    value: p.views,
  }));

  const stocks = b.top_stocks_viewed.map((s) => ({
    code: s.code,
    value: s.views,
    secondary: `${s.users.toLocaleString()} ${s.users === 1 ? "viewer" : "viewers"}`,
  }));

  const attribution = b.attribution.map((a) => ({
    key: a.src,
    label: a.src,
    value: a.views,
    secondary: `${a.users.toLocaleString()} ${a.users === 1 ? "user" : "users"}`,
  }));

  const watched = data.popular_stocks.most_watched.map((s) => ({ code: s.code, value: s.count }));
  const held = data.popular_stocks.most_held.map((s) => ({
    code: s.code,
    value: s.count,
    secondary: s.total_qty != null ? `${Math.round(s.total_qty).toLocaleString()} shares held` : undefined,
  }));

  return (
    <div className="flex flex-col gap-6">
      <MetricRow metrics={context} cols="grid-cols-3" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Sections used" note={`views · last ${b.window_days}d`}>
          <BarList items={categories} color={COLORS.primary} />
        </Panel>
        <Panel title="Notification clicks" note="from ?src= deep links">
          {attribution.length ? (
            <BarList items={attribution} color={COLORS.orange} />
          ) : (
            <p className="py-6 text-center text-xs text-[var(--text-muted)]">
              No tagged notification traffic yet. Push/email links carry a{" "}
              <code className="font-mono">?src=</code> tag that shows up here.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Most-viewed stocks" note="by page views — research demand">
          <StockBarList items={stocks} priceMap={priceMap} color={COLORS.indigo} />
        </Panel>
        <Panel title="Top pages" note={`most-visited URLs · last ${b.window_days}d`}>
          <BarList items={pages} color={COLORS.primary} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Most watched" note="on user watchlists">
          <StockBarList items={watched} priceMap={priceMap} color={COLORS.primary} />
        </Panel>
        <Panel title="Most held" note="in user portfolios">
          <StockBarList items={held} priceMap={priceMap} color={COLORS.positive} />
        </Panel>
      </div>
    </div>
  );
}
