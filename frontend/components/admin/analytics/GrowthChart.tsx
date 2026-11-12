"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminAnalyticsResponse } from "@/lib/api";
import { CHART } from "@/lib/chart-theme";

function tickDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** 30 days: sign-ups a day as bars (right axis), active readers a day as a line. */
export default function GrowthChart({ growth }: { growth: AdminAnalyticsResponse["growth"] }) {
  return (
    <ResponsiveContainer width="100%" height={CHART.height.md}>
      <ComposedChart data={growth} margin={CHART.margin}>
        <CartesianGrid {...CHART.grid} />
        <XAxis dataKey="date" {...CHART.xAxis} tickFormatter={tickDate} interval="preserveStartEnd" minTickGap={28} />
        <YAxis yAxisId="active" {...CHART.yAxis} width={36} allowDecimals={false} />
        <YAxis yAxisId="signups" orientation="right" {...CHART.yAxis} width={28} allowDecimals={false} />
        <Tooltip {...CHART.tooltip} labelFormatter={(d) => tickDate(String(d))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="signups" dataKey="signups" name="Sign-ups" fill={CHART.color.primary}
          {...CHART.bar} isAnimationActive={false} />
        <Line yAxisId="active" type="monotone" dataKey="active" name="Active readers"
          stroke={CHART.color.info} {...CHART.line} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
