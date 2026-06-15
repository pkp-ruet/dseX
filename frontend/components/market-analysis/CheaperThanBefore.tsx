"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { MarketTrendPoint } from "@/lib/api";

function shortDate(d: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return d;
  }
}

/**
 * "Are shares cheaper than before?" — a soft-filled area line that grows over
 * time. Higher = more shares are cheap. We start tracking from today (no
 * back-history), so early on we just say it's filling in.
 */
export default function CheaperThanBefore({
  points,
  hasHistory,
}: {
  points: MarketTrendPoint[];
  hasHistory: boolean;
}) {
  const data = points
    .filter((p) => p.date && p.cheap_pct != null)
    .map((p) => ({ date: shortDate(p.date), cheap: Math.round(p.cheap_pct as number) }));

  return (
    <div className="ms-card">
      <p className="ms-card-title">Are shares cheaper than before?</p>
      <p className="ms-card-note">
        When the line climbs, more shares are cheap. When it dips, shares are getting pricier.
      </p>
      {hasHistory && data.length >= 5 ? (
        <div style={{ width: "100%", height: 210 }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="msCheapFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--cell-rule)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={24}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(v: number) => [`${v}% of shares are cheap`, ""]}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)" }}
                labelStyle={{ color: "var(--text-muted)" }}
              />
              <Area
                type="monotone"
                dataKey="cheap"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#msCheapFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="ms-trend-empty">
          <span className="ms-trend-empty-ico" aria-hidden="true">
            ↗
          </span>
          <p className="ms-empty" style={{ padding: 0 }}>
            We just started keeping this record. Check back in a few days to watch whether shares
            are getting cheaper or pricier over time.
          </p>
        </div>
      )}
    </div>
  );
}
