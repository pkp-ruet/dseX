"use client";
import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { getPriceHistory } from "@/lib/api";
import { priceTrendCaption } from "@/lib/plain-language";

interface Props {
  code: string;
}

type Range = "1M" | "6M" | "1Y";
const RANGES: Range[] = ["1M", "6M", "1Y"];

interface DataPoint { date: string; ltp: number; }

function formatDateTick(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PriceChart({ code }: Props) {
  const [range, setRange] = useState<Range>("1Y");
  const [rawData, setRawData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiRange: "1y" = "1y";

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPriceHistory(code, apiRange)
      .then((pts) => {
        if (cancelled) return;
        const filtered = (pts ?? [])
          .filter((p) => p && p.ltp != null && p.date != null)
          .map((p) => ({ date: String(p.date).slice(0, 10), ltp: Number(p.ltp) }))
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
  }, [code, apiRange]);

  const data: DataPoint[] = useMemo(() => {
    if (range === "1M") return rawData.slice(-30);
    if (range === "6M") return rawData.slice(-180);
    return rawData;
  }, [rawData, range]);

  const caption = useMemo(() => priceTrendCaption(data, range), [data, range]);

  const trend = data.length >= 2 ? data[data.length - 1].ltp - data[0].ltp : 0;
  const lineColor = trend >= 0 ? "#34D399" : "#F87171";
  const fillTop   = trend >= 0 ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)";
  const fillBottom= trend >= 0 ? "rgba(52,211,153,0.0)"  : "rgba(248,113,113,0.0)";

  return (
    <section
      className="rounded-3xl mb-8 p-5 sm:p-7"
      style={{
        background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)",
        border: "1px solid #1E3A5F",
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "#F1F5F9" }}>
            The Price Story
          </h2>
          {caption && (
            <p className="text-sm mt-1" style={{ color: lineColor }}>
              {caption}
            </p>
          )}
        </div>
        <div
          className="inline-flex rounded-full p-1 self-start"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1.5 text-xs font-bold rounded-full transition-all tabular-nums"
              style={{
                color: range === r ? "#0A1525" : "#94A3B8",
                background: range === r ? "#F1F5F9" : "transparent",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl" style={{ background: "rgba(0,0,0,0.15)" }}>
        {loading ? (
          <div className="h-[320px] flex items-center justify-center text-sm" style={{ color: "#94A3B8" }}>
            Loading chart...
          </div>
        ) : error ? (
          <div className="h-[320px] flex flex-col items-center justify-center gap-2 text-sm px-6 text-center">
            <span style={{ color: "#F87171" }}>Couldn't load price chart.</span>
            <span className="text-xs" style={{ color: "#94A3B8" }}>{error}</span>
            <span className="text-[11px] mt-1" style={{ color: "#64748B" }}>
              Check the browser console for details.
            </span>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-sm" style={{ color: "#94A3B8" }}>
            No price data available for this stock.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={fillTop} />
                  <stop offset="100%" stopColor={fillBottom} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#1E3A5F" strokeOpacity={0.4} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                tickFormatter={formatDateTick}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                tickFormatter={(v: number) => `৳${v}`}
                width={56}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(val: number) => [`৳${val.toFixed(2)}`, "Price"]}
                labelFormatter={(label: string) => formatTooltipDate(label)}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: "8px",
                  border: "1px solid #1E3A5F",
                  background: "#0A1525",
                  color: "#F1F5F9",
                }}
              />
              <Area
                type="monotone"
                dataKey="ltp"
                stroke={lineColor}
                strokeWidth={2.5}
                fill="url(#priceArea)"
                isAnimationActive={true}
                animationDuration={500}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
