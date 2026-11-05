"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { T } from "@/components/i18n/T";
import Tabs from "@/components/ui/Tabs";
import { useLang } from "@/context/LangContext";
import type { MarketHistoryIndexPoint } from "@/lib/api";
import { bnDate } from "@/lib/bn";
import { CHART } from "@/lib/chart-theme";
import { formatDate } from "@/lib/formatters";
import MkCard from "@/components/market-analysis/MkCard";

const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const BN_MONTH_SHORT = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];

type RangeKey = "1m" | "3m" | "all";
/** Trading days in each range (DSE trades five days a week). */
const DAYS: Record<Exclude<RangeKey, "all">, number> = { "1m": 22, "3m": 65 };

function two(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function whole(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
function pctOf(change: number | null | undefined, value: number | null | undefined): number | null {
  if (change == null || value == null) return null;
  const before = value - change;
  return before ? (change / before) * 100 : null;
}
function moveText(change: number | null | undefined, pct: number | null | undefined): string | null {
  if (change == null) return null;
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "";
  const p = pct == null ? "" : ` · ${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct).toFixed(2)}%`;
  return `${arrow} ${two(Math.abs(change))}${p}`.trim();
}
function tone(v: number | null | undefined): string {
  return v == null || v === 0 ? "" : v > 0 ? "mk-ix-chg--up" : "mk-ix-chg--down";
}
function shortDate(d: string, bn: boolean): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return d;
  const day = Number(m[3]);
  const mon = Number(m[2]) - 1;
  return bn ? `${day} ${BN_MONTH_SHORT[mon]}` : `${day} ${EN_MONTHS[mon].slice(0, 3)}`;
}

/**
 * Block 2 of the market page — the index: DSEX with today's move, a chart with
 * three ranges (1 month · 3 months · everything we hold), this year's high and
 * low, and DSES / DS30 under it. The numbers render on the server; the chart
 * draws in the browser.
 */
export default function IndexCard({
  dsex,
  dsexChange,
  dsexPct,
  dses,
  dsesChange,
  ds30,
  ds30Change,
  history,
  yearHigh,
  yearLow,
}: {
  dsex: number | null;
  dsexChange: number | null;
  dsexPct: number | null;
  dses: number | null;
  dsesChange: number | null;
  ds30: number | null;
  ds30Change: number | null;
  history: MarketHistoryIndexPoint[];
  yearHigh: number | null;
  yearLow: number | null;
}) {
  const bn = useLang().lang === "bn";
  const points = useMemo(
    () => history.filter((p) => p.dsex != null).map((p) => ({ date: p.date, v: p.dsex as number })),
    [history],
  );

  // "Since April" while the record is under a year old, "1 year" after.
  const first = points[0]?.date;
  const last = points[points.length - 1]?.date;
  const span = first && last ? (Date.parse(last) - Date.parse(first)) / 86_400_000 : 0;
  const firstMonth = first ? Number(first.slice(5, 7)) - 1 : 0;
  const allLabel = span >= 330
    ? { en: "1 year", bn: "1 বছর" }
    : { en: `Since ${EN_MONTHS[firstMonth]}`, bn: `${BN_MONTHS[firstMonth]} থেকে` };

  const ranges: { key: RangeKey; label: { en: string; bn: string } }[] = [];
  if (points.length > DAYS["1m"] + 5) ranges.push({ key: "1m", label: { en: "1 month", bn: "1 মাস" } });
  if (points.length > DAYS["3m"] + 10) ranges.push({ key: "3m", label: { en: "3 months", bn: "3 মাস" } });
  ranges.push({ key: "all", label: allLabel });
  const [range, setRange] = useState<RangeKey>("all");

  const data = range === "all" ? points : points.slice(-DAYS[range]);
  const start = data[0];
  const end = data[data.length - 1];
  const periodPct = start && end && start.v ? ((end.v - start.v) / start.v) * 100 : null;
  const stroke = periodPct == null || periodPct >= 0 ? CHART.color.positive : CHART.color.negative;

  const pct = dsexPct ?? pctOf(dsexChange, dsex);
  const subs = [
    { name: "DSES", what: { en: "Shariah-based shares", bn: "শরিয়াহভিত্তিক শেয়ার" }, v: dses, c: dsesChange },
    { name: "DS30", what: { en: "The 30 biggest companies", bn: "বড় 30টি কোম্পানি" }, v: ds30, c: ds30Change },
  ].filter((s) => s.v != null);

  return (
    <MkCard>
      <div className="mk-ix-top">
        <div className="min-w-0">
          <p className="mk-ix-label" id="mk-ix">
            <T en="DSEX, the main index" bn="ডিএসইএক্স, প্রধান সূচক" />
          </p>
          {dsex != null && <p className="mk-ix-value">{two(dsex)}</p>}
          {dsexChange != null && (
            <span className={`mk-ix-chg ${tone(dsexChange)}`}>{moveText(dsexChange, pct)}</span>
          )}
        </div>
        {ranges.length > 1 && (
          <Tabs
            tabs={ranges.map((r) => ({ key: r.key, label: <T en={r.label.en} bn={r.label.bn} /> }))}
            value={range}
            onChange={setRange}
            ariaLabel={bn ? "চার্টের সময়" : "Chart range"}
            idBase="mk-ix-range"
          />
        )}
      </div>

      {data.length >= 5 && (
        <div role="tabpanel" aria-labelledby={`mk-ix-range-${range}`}>
          <div className="mk-ix-chart" style={{ height: CHART.height.md }}>
            <ResponsiveContainer>
              <AreaChart data={data} margin={CHART.margin}>
                <CartesianGrid {...CHART.grid} />
                <XAxis dataKey="date" tickFormatter={(d: string) => shortDate(d, bn)} {...CHART.xAxis} minTickGap={32} />
                <YAxis
                  domain={[
                    (min: number) => Math.floor((min * 0.995) / 25) * 25,
                    (max: number) => Math.ceil((max * 1.005) / 25) * 25,
                  ]}
                  {...CHART.yAxis}
                  width={48}
                  tickFormatter={(v: number) => whole(v)}
                />
                <Tooltip
                  {...CHART.tooltip}
                  formatter={(v: number) => [bn ? `সূচক ${whole(v)}` : `DSEX ${whole(v)}`, ""]}
                  labelFormatter={(d: string) => (bn ? bnDate(d) : formatDate(d))}
                />
                <Area type="monotone" dataKey="v" stroke={stroke} fill={stroke} {...CHART.area} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {periodPct != null && start && (
            <p className="mk-ix-period">
              <T
                en={`${periodPct >= 0 ? "Up" : "Down"} ${Math.abs(periodPct).toFixed(1)}% since ${formatDate(start.date)}.`}
                bn={`${bnDate(start.date)} থেকে ${Math.abs(periodPct).toFixed(1)}% ${periodPct >= 0 ? "বেড়েছে" : "কমেছে"}।`}
              />{" "}
              {yearHigh != null && yearLow != null && (
                <T
                  en={`This year's highest close was ${whole(yearHigh)} and its lowest ${whole(yearLow)}.`}
                  bn={`এ বছর সর্বোচ্চ ছিল ${whole(yearHigh)}, সর্বনিম্ন ${whole(yearLow)}।`}
                />
              )}
            </p>
          )}
        </div>
      )}

      {subs.length > 0 && (
        <div className="mk-ix-subs">
          {subs.map((s) => (
            <div className="mk-ix-sub" key={s.name}>
              <p className="mk-ix-sub-k">
                <b>{s.name}</b>{" "}
                <span>
                  <T en={s.what.en} bn={s.what.bn} />
                </span>
              </p>
              <p className="mk-ix-sub-v">{two(s.v as number)}</p>
              {s.c != null && <p className={`mk-ix-sub-c ${tone(s.c)}`}>{moveText(s.c, pctOf(s.c, s.v))}</p>}
            </div>
          ))}
        </div>
      )}
    </MkCard>
  );
}
