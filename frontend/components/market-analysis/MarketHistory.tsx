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
import Tabs from "@/components/ui/Tabs";
import type { MarketHistory as MarketHistoryData } from "@/lib/api";
import { formatDate, signed } from "@/lib/formatters";
import { CHART } from "@/lib/chart-theme";
import MkCard from "./MkCard";

type TabKey = "index" | "healthy" | "cheap" | "bargains";

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
    color: CHART.color.primary,
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
    color: CHART.color.positive,
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
    color: CHART.color.info,
    note: "The share of stocks priced below their own usual level. When the line climbs, more shares are cheap.",
    noteBn: "যত শতাংশ শেয়ারের দাম নিজের স্বাভাবিকের চেয়ে কম। লাইন উপরে গেলে আরও শেয়ার সস্তা।",
    fmt: (v) => `${Math.round(v)}%`,
    tip: (v) => `${Math.round(v)}% of shares are cheap`,
    domain: [
      (min) => Math.max(0, Math.floor((min - 4) / 5) * 5),
      (max) => Math.min(100, Math.ceil((max + 4) / 5) * 5),
    ],
  },
  {
    key: "bargains",
    label: "Bargains",
    color: CHART.color.primary,
    note: "How many companies pass every check on our “Good companies at a low price” list. When the line climbs, more good companies are selling cheap.",
    noteBn: "“কম দামে ভালো কোম্পানি” তালিকার সব যাচাই কতটি কোম্পানি পেরিয়েছে। লাইন উপরে গেলে আরও ভালো কোম্পানি কম দামে পাওয়া যাচ্ছে।",
    fmt: (v) => `${Math.round(v)}`,
    tip: (v) => `${Math.round(v)} good ${Math.round(v) === 1 ? "company" : "companies"} at a low price`,
    domain: [
      (min) => Math.max(0, Math.floor(min - 2)),
      (max) => Math.ceil(max + 2),
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
  if (key === "bargains") {
    return (h.bargains ?? []).map((p) => ({ date: p.date, v: p.n }));
  }
  const field = key === "healthy" ? "healthy_pct" : "cheap_pct";
  return h.daily
    .filter((p) => p[field] != null)
    .map((p) => ({ date: p.date, v: p[field] as number }));
}

/**
 * "How the market has moved" — one card, four tabs: the DSEX this year, the
 * share of healthy companies, the share of cheap shares, and the bargain count
 * (companies passing the "Good companies at a low price" research list — a
 * count, so it is free; the names are Premium). The last three come from
 * snapshots this app stores itself, so they fill in over time.
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
      <MkCard title="How the market has moved" bn="বাজার কীভাবে এখানে এলো">
        <p className="mk-empty">
          We just started keeping this record. Check back in a few days to see how the market is moving over time.
        </p>
      </MkCard>
    );
  }

  const data = series[tab.key];
  const first = data[0];
  const last = data[data.length - 1];
  const chgPct = first.v ? ((last.v - first.v) / first.v) * 100 : null;
  const delta = last.v - first.v;

  return (
    <MkCard title="How the market has moved" bn="বাজার কীভাবে এখানে এলো">
      {available.length > 1 && (
        <Tabs
          tabs={available.map((t) => ({ key: t.key, label: t.label }))}
          value={tab.key}
          onChange={setChosen}
          ariaLabel="Pick what to chart"
          idBase="mk-hist"
        />
      )}

      <div role="tabpanel" aria-labelledby={`mk-hist-${tab.key}`}>
        <div className="mk-hist-num">
          <span className="mk-bignum-n">{tab.fmt(last.v)}</span>
          {tab.key === "index" ? (
            chgPct != null && (
              <span className={`mk-delta ${chgPct >= 0 ? "mk-delta--up" : "mk-delta--down"}`}>
                {signed(chgPct, 1)}% since {formatDate(first.date)}
              </span>
            )
          ) : (
            <span className={`mk-delta ${delta > 0 ? "mk-delta--up" : delta < 0 ? "mk-delta--down" : ""}`}>
              was {tab.fmt(first.v)} on {formatDate(first.date)}
            </span>
          )}
        </div>
        <p className="mk-card-note">{tab.note}</p>
        <Bn className="mk-card-bn">{tab.noteBn}</Bn>

        <div className="mt-4" style={{ width: "100%", height: CHART.height.md }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={CHART.margin}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={shortDate} {...CHART.xAxis} minTickGap={28} />
              <YAxis
                domain={tab.domain}
                {...CHART.yAxis}
                width={tab.key === "index" ? 48 : 36}
                tickFormatter={(v: number) => tab.fmt(v)}
              />
              <Tooltip
                {...CHART.tooltip}
                formatter={(v: number) => [tab.tip(v), ""]}
                labelFormatter={(d: string) => formatDate(d)}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={tab.color}
                fill={tab.color}
                {...CHART.area}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </MkCard>
  );
}
