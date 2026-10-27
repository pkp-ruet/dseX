"use client";
import { useState, useEffect, useMemo } from "react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
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

interface Props {
  code: string;
}

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

export default function PriceChart({ code }: Props) {
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
                labelFormatter={(label: string) => formatTooltipDate(label, bn)}
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
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
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
