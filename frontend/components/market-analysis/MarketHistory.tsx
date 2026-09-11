"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import Bn from "@/components/i18n/Bn";
import { IconTrendUp } from "@/components/home/personalized/DashIcons";
import type { MarketHistory as MarketHistoryData } from "@/lib/api";
import { formatDate, signed } from "@/lib/formatters";

type TabKey = "index" | "healthy" | "cheap";

interface Point {
  date: string;
  v: number;
}

interface Tab {
  key: TabKey;
  label: string;
  color: string;
  note: string;
  noteBn: string;
  /** Axis / headline number. */
  fmt: (v: number) => string;
  /** Tooltip sentence. */
  tip: (v: number) => string;
  domain: [(min: number) => number, (max: number) => number];
}

const TABS: Tab[] = [
  {
    key: "index",
    label: "Market this year",
    color: "var(--primary)",
    note: "The DSEX index — the whole market in one number. When the line climbs, shares rose overall.",
    noteBn: "ডিএসইএক্স সূচক — পুরো বাজারের একটি সংখ্যা। লাইন উপরে গেলে সব মিলিয়ে দাম বেড়েছে।",
    fmt: (v) => Math.round(v).toLocaleString("en-US"),
    tip: (v) => `Index at ${Math.round(v).toLocaleString("en-US")}`,
    domain: [
      (min) => Math.floor((min * 0.99) / 50) * 50,
      (max) => Math.ceil((max * 1.01) / 50) * 50,
    ],
  },
  {
    key: "healthy",
    label: "Healthy companies",
    color: "var(--positive)",
    note: "The share of companies that score Strong or Good. When it climbs, more companies are in good shape.",
    noteBn: "যত শতাংশ কোম্পানি ভালো বা চমৎকার অবস্থায় আছে। লাইন উপরে গেলে আরও কোম্পানি ভালো করছে।",
    fmt: (v) => `${Math.round(v)}%`,
    tip: (v) => `${Math.round(v)}% of companies look healthy`,
    domain: [
      (min) => Math.max(0, Math.floor((min - 4) / 5) * 5),
      (max) => Math.min(100, Math.ceil((max + 4) / 5) * 5),
    ],
  },
  {
    key: "cheap",
    label: "Cheap shares",
    color: "var(--warm)",
    note: "The share of stocks priced below their own usual level. When the line climbs, more shares are cheap.",
    noteBn: "যত শতাংশ শেয়ারের দাম নিজের স্বাভাবিকের চেয়ে কম। লাইন উপরে গেলে আরও শেয়ার সস্তা।",
    fmt: (v) => `${Math.round(v)}%`,
    tip: (v) => `${Math.round(v)}% of shares are cheap`,
    domain: [
      (min) => Math.max(0, Math.floor((min - 4) / 5) * 5),
      (max) => Math.min(100, Math.ceil((max + 4) / 5) * 5),
    ],
  },
];

const MIN_POINTS = 5;

function shortDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return d;
  }
}

function seriesFor(key: TabKey, h: MarketHistoryData): Point[] {
  if (key === "index") {
    return h.index.filter((p) => p.dsex != null).map((p) => ({ date: p.date, v: p.dsex as number }));
  }
  const field = key === "healthy" ? "healthy_pct" : "cheap_pct";
  return h.daily
    .filter((p) => p[field] != null)
    .map((p) => ({ date: p.date, v: p[field] as number }));
}

/**
 * "How the market has moved" — one card, three tabs: the DSEX this year, the
 * share of healthy companies, and the share of cheap shares. The last two come
 * from the daily snapshots this app stores itself, so they fill in over time.
 */
export default function MarketHistory({ history }: { history: MarketHistoryData }) {
  const series = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, seriesFor(t.key, history)])) as Record<TabKey, Point[]>,
    [history],
  );
  const available = TABS.filter((t) => series[t.key].length >= MIN_POINTS);
  const [chosen, setChosen] = useState<TabKey | null>(null);
  const tab = available.find((t) => t.key === chosen) ?? available[0] ?? null;

  if (!tab) {
    return (
      <div className="ms-card">
        <p className="ms-card-title">How the market has moved</p>
        <div className="ms-trend-empty">
          <span className="ms-trend-empty-ico" aria-hidden="true">
            <IconTrendUp size={18} />
          </span>
          <p className="ms-empty" style={{ padding: 0 }}>
            We just started keeping this record. Check back in a few days to see how the market is
            moving over time.
          </p>
        </div>
      </div>
    );
  }

  const data = series[tab.key];
  const first = data[0];
  const last = data[data.length - 1];
  const chgPct = first.v ? ((last.v - first.v) / first.v) * 100 : null;
  const delta = last.v - first.v;
  const gradId = `msHist-${tab.key}`;

  return (
    <div className="ms-card">
      <p className="ms-card-title">How the market has moved</p>

      {available.length > 1 && (
        <div className="ms-tabs" role="tablist" aria-label="Pick what to chart">
          {available.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === tab.key}
              className={`ms-tab${t.key === tab.key ? " ms-tab--on" : ""}`}
              onClick={() => setChosen(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="ms-hist-meta">
        <span className="ms-hist-now">{tab.fmt(last.v)}</span>
        {tab.key === "index" ? (
          chgPct != null && (
            <span className={`ms-hist-chg ${chgPct >= 0 ? "ms-pos" : "ms-neg"}`}>
              {signed(chgPct, 1)}% since {formatDate(first.date)}
            </span>
          )
        ) : (
          <span className={`ms-hist-chg ${delta >= 0 ? "ms-pos" : "ms-neg"}`}>
            was {tab.fmt(first.v)} on {formatDate(first.date)}
          </span>
        )}
      </div>
      <p className="ms-card-note">{tab.note}</p>

      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tab.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={tab.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--cell-rule)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={28}
            />
            <YAxis
              domain={tab.domain}
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={false}
              width={tab.key === "index" ? 44 : 34}
              tickFormatter={(v: number) => tab.fmt(v)}
            />
            <Tooltip
              formatter={(v: number) => [tab.tip(v), ""]}
              labelFormatter={(d: string) => formatDate(d)}
              contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)" }}
              labelStyle={{ color: "var(--text-muted)" }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={tab.color}
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <Bn className="ms-note-bn">{tab.noteBn}</Bn>
    </div>
  );
}
