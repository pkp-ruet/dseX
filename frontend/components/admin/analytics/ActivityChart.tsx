"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/chart-theme";
import { n, shortDate } from "./shared";

type Point = { date: string; active: number; views: number };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const p = active && payload?.[0]?.payload;
  if (!p) return null;
  return (
    <div style={CHART.tooltip.contentStyle}>
      <p className="text-xs font-semibold text-text-muted">{shortDate(p.date)}</p>
      <p className="text-sm text-text-main">
        <span className="font-bold tabular-nums">{n(p.active)}</span> active readers
      </p>
      <p className="text-xs text-text-muted">{n(p.views)} page views</p>
    </div>
  );
}

/** Active readers per Dhaka day across the window, one bar a day. */
export default function ActivityChart({ daily, color }: { daily: Point[]; color: string }) {
  if (!daily.some((d) => d.active)) {
    return <p className="py-6 text-center text-xs text-text-muted">No activity in this window.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={CHART.height.md}>
      <BarChart data={daily} margin={CHART.margin}>
        <CartesianGrid {...CHART.grid} />
        <XAxis dataKey="date" {...CHART.xAxis} tickFormatter={shortDate} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...CHART.yAxis} width={32} allowDecimals={false} />
        <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<Tip />} />
        <Bar dataKey="active" fill={color} {...CHART.bar} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
