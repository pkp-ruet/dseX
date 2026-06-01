"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AdminGrowthPoint } from "@/lib/api";
import { COLORS, TOOLTIP_STYLE } from "./shared";

function tickDate(d: string): string {
  // d = YYYY-MM-DD
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function GrowthChart({ growth }: { growth: AdminGrowthPoint[] }) {
  const [range, setRange] = useState<30 | 90>(30);
  const data = growth.slice(-range);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold text-[var(--text)]">Signups &amp; active users</h3>
        <div className="flex gap-1 rounded-lg border border-[var(--border)] p-0.5">
          {([30, 90] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                range === r
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.positive} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COLORS.positive} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" strokeOpacity={0.8} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: COLORS.muted }}
            tickFormatter={tickDate}
            interval="preserveStartEnd"
            minTickGap={28}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: COLORS.muted }} allowDecimals={false} width={36} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(d: string) => tickDate(d)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            name="Signups"
            dataKey="signups"
            stroke={COLORS.primary}
            strokeWidth={2}
            fill="url(#gSignups)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            name="Active"
            dataKey="active"
            stroke={COLORS.positive}
            strokeWidth={2}
            fill="url(#gActive)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-[var(--text-muted)] mt-2">
        Active = distinct users with tracked page views that day. Fills in over time as activity is recorded.
      </p>
    </div>
  );
}
