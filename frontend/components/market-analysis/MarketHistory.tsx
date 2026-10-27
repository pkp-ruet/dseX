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
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { bnDate } from "@/lib/bn";
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
  labelBn: string;
  color: string;
  note: string;
  noteBn: string;
  /** Axis / headline number. */
  fmt: (v: number) => string;
  /** Tooltip sentence, in each language. */
  tip: (v: number) => string;
  tipBn: (v: number) => string;
  domain: [(min: number) => number, (max: number) => number];
}

const TABS: Tab[] = [
  {
    key: "index",
    label: "Market this year",
    labelBn: "এ বছরের বাজার",
    color: CHART.color.primary,
    note: "The DSEX index shows the whole market in one number. When the line climbs, shares rose overall.",
    noteBn: "ডিএসইএক্স সূচক পুরো বাজারকে একটি সংখ্যায় দেখায়। লাইন ওপরে উঠলে সব মিলিয়ে শেয়ারের দাম বেড়েছে।",
    fmt: (v) => Math.round(v).toLocaleString("en-US"),
    tip: (v) => `Index at ${Math.round(v).toLocaleString("en-US")}`,
    tipBn: (v) => `সূচক ${Math.round(v).toLocaleString("en-US")}`,
    domain: [
      (min) => Math.floor((min * 0.99) / 50) * 50,
      (max) => Math.ceil((max * 1.01) / 50) * 50,
    ],
  },
  {
    key: "healthy",
    label: "Healthy companies",
    labelBn: "ভালো অবস্থার কোম্পানি",
    color: CHART.color.positive,
    note: "The share of companies graded Excellent or Good. When the line climbs, more companies are in good shape.",
    noteBn: "চমৎকার বা ভালো গ্রেডের কোম্পানি কত শতাংশ। লাইন ওপরে উঠলে আরও বেশি কোম্পানি ভালো অবস্থায় আছে।",
    fmt: (v) => `${Math.round(v)}%`,
    tip: (v) => `${Math.round(v)}% of companies look healthy`,
    tipBn: (v) => `${Math.round(v)}% কোম্পানি ভালো অবস্থায়`,
    domain: [
      (min) => Math.max(0, Math.floor((min - 4) / 5) * 5),
      (max) => Math.min(100, Math.ceil((max + 4) / 5) * 5),
    ],
  },
  {
    key: "cheap",
    label: "Cheap shares",
    labelBn: "সস্তা শেয়ার",
    color: CHART.color.info,
    note: "The share of shares priced below their own usual level. When the line climbs, more shares are cheap.",
    noteBn: "কত শতাংশ শেয়ারের দাম নিজের স্বাভাবিক দামের চেয়ে কম। লাইন ওপরে উঠলে আরও বেশি শেয়ার সস্তা।",
    fmt: (v) => `${Math.round(v)}%`,
    tip: (v) => `${Math.round(v)}% of shares are cheap`,
    tipBn: (v) => `${Math.round(v)}% শেয়ার সস্তা`,
    domain: [
      (min) => Math.max(0, Math.floor((min - 4) / 5) * 5),
      (max) => Math.min(100, Math.ceil((max + 4) / 5) * 5),
    ],
  },
  {
    key: "bargains",
    label: "Bargains",
    labelBn: "কম দামে ভালো",
    color: CHART.color.primary,
    note: "How many companies pass every check on our “Good companies at a low price” list. When the line climbs, more good companies are selling cheap.",
    noteBn: "“কম দামে ভালো কোম্পানি” তালিকার সব যাচাই কতটি কোম্পানি পেরিয়েছে। লাইন ওপরে উঠলে আরও বেশি ভালো কোম্পানি কম দামে পাওয়া যাচ্ছে।",
    fmt: (v) => `${Math.round(v)}`,
    tip: (v) => `${Math.round(v)} good ${Math.round(v) === 1 ? "company" : "companies"} at a low price`,
    tipBn: (v) => `কম দামে ${Math.round(v)}টি ভালো কোম্পানি`,
    domain: [
      (min) => Math.max(0, Math.floor(min - 2)),
      (max) => Math.ceil(max + 2),
    ],
  },
];

const MIN_POINTS = 5;

const BN_MONTH_SHORT = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];

function shortDate(d: string, bn: boolean): string {
  try {
    const dt = new Date(d);
    if (bn) return `${dt.getDate()} ${BN_MONTH_SHORT[dt.getMonth()]}`;
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
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
  // The chart itself draws only in the browser, so its ticks and tooltip can
  // follow the language directly.
  const bn = useLang().lang === "bn";
  const title = <T en="How the market has moved" bn="বাজার কীভাবে এখানে এসেছে" />;
  const tab = available.find((t) => t.key === chosen) ?? available[0] ?? null;

  if (!tab) {
    return (
      <MkCard title={title}>
        <p className="mk-empty">
          <T
            en="We have just started keeping this record. Please check back in a few days to see how the market moves over time."
            bn="আমরা সবে এই হিসাব রাখা শুরু করেছি। সময়ের সঙ্গে বাজার কীভাবে চলে, তা দেখতে কয়েক দিন পর আবার দেখুন।"
          />
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
    <MkCard title={title}>
      {available.length > 1 && (
        <Tabs
          tabs={available.map((t) => ({ key: t.key, label: <T en={t.label} bn={t.labelBn} /> }))}
          value={tab.key}
          onChange={setChosen}
          ariaLabel={bn ? "চার্টে কী দেখাবেন" : "Pick what to chart"}
          idBase="mk-hist"
        />
      )}

      <div role="tabpanel" aria-labelledby={`mk-hist-${tab.key}`}>
        <div className="mk-hist-num">
          <span className="mk-bignum-n">{tab.fmt(last.v)}</span>
          {tab.key === "index" ? (
            chgPct != null && (
              <span className={`mk-delta ${chgPct >= 0 ? "mk-delta--up" : "mk-delta--down"}`}>
                <T
                  en={`${signed(chgPct, 1)}% since ${formatDate(first.date)}`}
                  bn={`${bnDate(first.date)} থেকে ${signed(chgPct, 1)}%`}
                />
              </span>
            )
          ) : (
            <span className={`mk-delta ${delta > 0 ? "mk-delta--up" : delta < 0 ? "mk-delta--down" : ""}`}>
              <T
                en={`was ${tab.fmt(first.v)} on ${formatDate(first.date)}`}
                bn={`${bnDate(first.date)}-এ ছিল ${tab.fmt(first.v)}`}
              />
            </span>
          )}
        </div>
        <p className="mk-card-note">
          <T en={tab.note} bn={tab.noteBn} />
        </p>

        <div className="mt-4" style={{ width: "100%", height: CHART.height.md }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={CHART.margin}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={(d: string) => shortDate(d, bn)} {...CHART.xAxis} minTickGap={28} />
              <YAxis
                domain={tab.domain}
                {...CHART.yAxis}
                width={tab.key === "index" ? 48 : 36}
                tickFormatter={(v: number) => tab.fmt(v)}
              />
              <Tooltip
                {...CHART.tooltip}
                formatter={(v: number) => [bn ? tab.tipBn(v) : tab.tip(v), ""]}
                labelFormatter={(d: string) => (bn ? bnDate(d) : formatDate(d))}
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
