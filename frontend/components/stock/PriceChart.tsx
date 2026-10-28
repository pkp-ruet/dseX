"use client";
import { useState, useEffect, useMemo } from "react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceDot, ReferenceArea,
} from "recharts";
import { getPriceHistory } from "@/lib/api";
import { priceTrendCaption } from "@/lib/plain-language";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { bnDate } from "@/lib/bn";
import { CHART } from "@/lib/chart-theme";
import { formatDate } from "@/lib/formatters";
import type { ChartEvent } from "@/lib/stock-report";

interface Props {
  code: string;
  /** Report events pinned on the chart (results, dividends, insider trades …). */
  events?: ChartEvent[];
}

/** One colour per event kind (the key under the chart names them). Colour
 *  means the kind, not up / down — except insider trades, where a buy is
 *  green and a sale red. */
const EVENT_STYLE: Record<ChartEvent["kind"], { color: string; en: string; bn: string }> = {
  results: { color: "var(--info)", en: "Results", bn: "আর্থিক ফল" },
  dividend: { color: "var(--gold-ink)", en: "Dividend", bn: "ডিভিডেন্ড" },
  record: { color: "var(--gold-ink)", en: "Dividend", bn: "ডিভিডেন্ড" },
  insider_buy: { color: "var(--positive)", en: "Insider buying", bn: "উদ্যোক্তা-পরিচালকের কেনা" },
  insider_sell: { color: "var(--negative)", en: "Insider selling", bn: "উদ্যোক্তা-পরিচালকের বিক্রি" },
  category: { color: "var(--watch)", en: "Category change", bn: "ক্যাটাগরি বদল" },
  rating: { color: "var(--navy)", en: "Credit rating", bn: "ক্রেডিট রেটিং" },
};

/** Events closer than this share of the visible days share one dot. */
const CLUSTER_SHARE = 0.03;

type Range = "1M" | "6M" | "1Y" | "5Y";
const RANGES: Range[] = ["1M", "6M", "1Y", "5Y"];
const RANGE_DAYS: Record<Range, number | null> = { "1M": 31, "6M": 183, "1Y": 366, "5Y": null };
const RANGE_LABEL: Record<Range, { en: string; bn: string }> = {
  "1M": { en: "1M", bn: "1 মাস" },
  "6M": { en: "6M", bn: "6 মাস" },
  "1Y": { en: "1Y", bn: "1 বছর" },
  "5Y": { en: "5Y", bn: "5 বছর" },
};
const MONTHS_BN = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];

interface DataPoint { date: string; ltp: number; volume: number; }

function formatDateTick(dateStr: string, bn: boolean): string {
  const d = new Date(dateStr);
  const months = bn ? MONTHS_BN : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

function formatTooltipDate(dateStr: string, bn: boolean): string {
  if (bn) return bnDate(dateStr) || dateStr;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatVolume(v: number): string {
  if (v >= 10_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

export default function PriceChart({ code, events = [] }: Props) {
  const [range, setRange] = useState<Range>("1Y");
  const [rawData, setRawData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { bn } = useLang();

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPriceHistory(code, "5y")
      .then((pts) => {
        if (cancelled) return;
        const filtered = (pts ?? [])
          .filter((p) => p && p.ltp != null && p.date != null)
          .map((p) => ({
            date: String(p.date).slice(0, 10),
            ltp: Number(p.ltp),
            volume: p.volume != null && Number(p.volume) > 0 ? Number(p.volume) : 0,
          }))
          .filter((p) => p.ltp > 0);
        setRawData(filtered);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error("[PriceChart] fetch failed:", err);
        setError(msg);
        setRawData([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [code]);

  const data: DataPoint[] = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days == null || rawData.length === 0) return rawData;
    const last = new Date(rawData[rawData.length - 1].date).getTime();
    const cutoff = last - days * 86_400_000;
    return rawData.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [rawData, range]);

  const caption = useMemo(() => priceTrendCaption(data, range), [data, range]);

  // Events snapped to the first trading day on or after them, inside the range.
  const pins = useMemo(() => {
    if (!data.length || !events.length) return [];
    const first = data[0].date;
    const last = data[data.length - 1].date;
    const snap = (d: string) => data.find((p) => p.date >= d.slice(0, 10))?.date ?? null;
    return events
      .filter((e) => e.date && e.date.slice(0, 10) >= first && e.date.slice(0, 10) <= last)
      .map((e) => ({ ...e, x: snap(e.date), x2: e.end ? snap(e.end) ?? last : null }))
      .filter((e): e is typeof e & { x: string } => e.x != null);
  }, [data, events]);

  // On the chart (2026-10-29: letters along the top overlapped — "R" on "D" —
  // and three insider trades drew three bands and three "I"s): one dot on
  // the price line per event, events a few days apart share one numbered
  // dot, and overlapping insider trades are one band.
  const { dots, spans, onDate } = useMemo(() => {
    const index = new Map(data.map((p, i) => [p.date, i]));
    const gap = Math.max(2, Math.round(data.length * CLUSTER_SHARE));
    const sorted = [...pins].sort((a, b) => (index.get(a.x) ?? 0) - (index.get(b.x) ?? 0));
    const clusters: { idx: number; last: number; items: typeof pins }[] = [];
    for (const p of sorted) {
      const i = index.get(p.x) ?? 0;
      const c = clusters[clusters.length - 1];
      if (c && i - c.last <= gap) {
        c.items.push(p);
        c.last = i;
      } else {
        clusters.push({ idx: i, last: i, items: [p] });
      }
    }
    const dots = clusters.map((c) => {
      const colors = new Set(c.items.map((p) => EVENT_STYLE[p.kind]?.color));
      const mid = data[Math.round((c.idx + c.last) / 2)];
      return {
        x: mid.date,
        y: mid.ltp,
        n: c.items.length,
        color: colors.size === 1 ? [...colors][0] ?? "var(--text-muted)" : "var(--text)",
      };
    });
    // Insider trades: one band per run of overlapping (or nearly touching) spans, per side.
    const spans: { x1: string; x2: string; color: string }[] = [];
    for (const kind of ["insider_buy", "insider_sell"] as const) {
      const runs = pins
        .filter((p) => p.kind === kind && p.x2 && p.x2 !== p.x)
        .map((p) => [index.get(p.x) ?? 0, index.get(p.x2!) ?? 0] as [number, number])
        .sort((a, b) => a[0] - b[0]);
      let cur: [number, number] | null = null;
      for (const r of runs) {
        if (cur && r[0] <= cur[1] + gap) cur[1] = Math.max(cur[1], r[1]);
        else {
          if (cur) spans.push({ x1: data[cur[0]].date, x2: data[cur[1]].date, color: EVENT_STYLE[kind].color });
          cur = [r[0], r[1]];
        }
      }
      if (cur) spans.push({ x1: data[cur[0]].date, x2: data[cur[1]].date, color: EVENT_STYLE[kind].color });
    }
    // The tooltip names what happened on the day under the pointer.
    const onDate = new Map<string, { en: string; bn: string }[]>();
    for (const p of pins) onDate.set(p.x, [...(onDate.get(p.x) ?? []), p.label]);
    return { dots, spans, onDate };
  }, [data, pins]);
  const kinds = useMemo(() => {
    const seen = new Map<string, (typeof EVENT_STYLE)[ChartEvent["kind"]]>();
    for (const p of pins) {
      const st = EVENT_STYLE[p.kind];
      if (st && !seen.has(st.en)) seen.set(st.en, st);
    }
    return [...seen.values()];
  }, [pins]);
  const recent = useMemo(() => [...pins].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5), [pins]);
  const hasVolume = useMemo(() => data.some((d) => d.volume > 0), [data]);

  const trend = data.length >= 2 ? data[data.length - 1].ltp - data[0].ltp : 0;
  const lineColor = trend >= 0 ? "var(--positive)" : "var(--negative)";
  const fillTop   = trend >= 0 ? "rgba(21,128,61,0.18)" : "rgba(220,38,38,0.18)";
  const fillBottom= trend >= 0 ? "rgba(21,128,61,0.0)"  : "rgba(220,38,38,0.0)";

  return (
    <Card as="section" padding="none" className="rounded-3xl mb-8 p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-main">
            <T en="How the price has moved" bn="দাম কীভাবে বদলেছে" />
          </h2>
          {caption && (
            <p className="text-sm mt-1" style={{ color: lineColor }}>
              <T en={caption.en} bn={caption.bn} />
            </p>
          )}
        </div>
        <div
          className="inline-flex rounded-full p-1 self-start"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          {RANGES.map((r) => (
            <Button
              key={r}
              variant="tab"
              size="sm"
              active={range === r}
              onClick={() => setRange(r)}
              className="tabular-nums nums"
            >
              <T en={RANGE_LABEL[r].en} bn={RANGE_LABEL[r].bn} />
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-surface-2">
        {loading ? (
          <div className="p-4">
            <Skeleton height={288} rounded="12px" />
          </div>
        ) : error ? (
          <div className="h-[320px] flex flex-col items-center justify-center gap-2 text-sm px-6 text-center">
            <span className="text-negative">
              <T en="We couldn't load the price chart." bn="দামের চার্ট লোড করা যায়নি।" />
            </span>
            <span className="text-xs mt-1 text-text-muted">
              <T en="Please try again in a moment." bn="একটু পরে আবার চেষ্টা করুন।" />
            </span>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-text-muted">
            <T en="We have no price history for this share yet." bn="এই শেয়ারের দামের ইতিহাস এখনো আমাদের কাছে নেই।" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            {/* right: 28 — the forced last tick ("Sep '26") is centred on the plot edge and was clipped at 16 */}
            <ComposedChart data={data} margin={{ top: 16, right: 28, left: 0, bottom: 8 }} barCategoryGap={0} barGap={0}>
              <defs>
                <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={fillTop} />
                  <stop offset="100%" stopColor={fillBottom} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART.grid} />
              <XAxis
                dataKey="date"
                tick={CHART.xAxis.tick}
                tickFormatter={(v: string) => formatDateTick(v, bn)}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="price"
                tick={CHART.xAxis.tick}
                tickFormatter={(v: number) => `৳${v}`}
                width={56}
                axisLine={false}
                tickLine={false}
                domain={["auto", "auto"]}
              />
              {/* Hidden axis keeps volume bars in the bottom third of the plot */}
              <YAxis
                yAxisId="volume"
                hide
                domain={[0, (dataMax: number) => (dataMax > 0 ? dataMax * 3 : 1)]}
              />
              <Tooltip
                formatter={(val: number, name: string) =>
                  name === "volume"
                    ? [formatVolume(val), bn ? "লেনদেন হওয়া শেয়ার" : "Shares traded"]
                    : [`৳${val.toFixed(2)}`, bn ? "দাম" : "Price"]
                }
                labelFormatter={(label: string) => {
                  const evs = onDate.get(label);
                  const day = formatTooltipDate(label, bn);
                  return evs?.length ? `${day} · ${evs.map((e) => (bn ? e.bn || e.en : e.en)).join(" · ")}` : day;
                }}
                contentStyle={CHART.tooltip.contentStyle}
              />
              {hasVolume && (
                <Bar
                  yAxisId="volume"
                  dataKey="volume"
                  fill="color-mix(in srgb, var(--text-muted) 45%, transparent)"
                  isAnimationActive={false}
                />
              )}
              {spans.map((sp, i) => (
                <ReferenceArea
                  key={`a${i}`}
                  yAxisId="price"
                  x1={sp.x1}
                  x2={sp.x2}
                  fill={sp.color}
                  fillOpacity={0.1}
                  ifOverflow="hidden"
                />
              ))}
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="ltp"
                stroke={lineColor}
                strokeWidth={2.5}
                fill="url(#priceArea)"
                isAnimationActive={true}
                animationDuration={500}
                animationEasing="ease-out"
              />
              {/* Event dots sit on the line, drawn after it so they stay on top. */}
              {dots.map((d, i) => (
                <ReferenceDot
                  key={`d${i}`}
                  yAxisId="price"
                  x={d.x}
                  y={d.y}
                  r={d.n > 1 ? 8 : 5}
                  fill={d.color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  ifOverflow="extendDomain"
                  label={d.n > 1 ? { value: String(d.n), position: "center", fill: "var(--surface)", fontSize: 11, fontWeight: 700 } : undefined}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      {recent.length > 0 && (
        <div className="mt-3 px-1">
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
            {kinds.map((k) => (
              <span key={k.en} className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: k.color }} aria-hidden="true" />
                <T en={k.en} bn={k.bn} />
              </span>
            ))}
            {dots.some((d) => d.n > 1) && (
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-text-main text-xs font-bold text-surface" aria-hidden="true">2</i>
                <T en="Events a few days apart" bn="কয়েক দিনের মধ্যে একাধিক ঘটনা" />
              </span>
            )}
          </p>
          <ul className="mt-2 grid gap-1">
            {recent.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug text-text-main">
                <i
                  className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: EVENT_STYLE[p.kind]?.color }}
                  aria-hidden="true"
                />
                <span className="w-24 shrink-0 text-xs leading-5 text-text-muted tabular-nums">
                  <T en={formatDate(p.date)} bn={bnDate(p.date) || formatDate(p.date)} />
                </span>
                <span className="min-w-0"><T en={p.label.en} bn={p.label.bn || p.label.en} /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasVolume && (
        <p className="text-xs mt-2 px-1 text-text-muted">
          <T
            en="The grey bars along the bottom show how many shares were traded each day."
            bn="নিচের ধূসর দাগগুলো দেখায় প্রতিদিন কতগুলো শেয়ার লেনদেন হয়েছে।"
          />
        </p>
      )}
    </Card>
  );
}
