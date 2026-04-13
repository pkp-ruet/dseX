"use client";
import { useState, useEffect, useMemo } from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import SectionLabel from "@/components/ui/SectionLabel";
import { getPriceHistory } from "@/lib/api";

interface Props {
  code: string;
}

type Range = "3m" | "6m" | "1y" | "2y" | "all";

const RANGE_LABELS: Record<Range, string> = {
  "3m": "3M",
  "6m": "6M",
  "1y": "1Y",
  "2y": "2Y",
  "all": "All",
};

interface DataPoint {
  date: string;
  ltp: number;
  volume: number | null;
  sma20: number | null;
}

function computeSMA(data: { ltp: number }[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j].ltp;
      result.push(sum / period);
    }
  }
  return result;
}

function formatDateTick(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

export default function PriceChart({ code }: Props) {
  const [range, setRange] = useState<Range>("1y");
  const [rawData, setRawData] = useState<{ date: string; ltp: number; volume: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch: only fetch 1y, 2y, or all from the API
  const apiRange = range === "3m" || range === "6m" ? "1y" : range;

  useEffect(() => {
    setLoading(true);
    getPriceHistory(code, apiRange as "1y" | "2y" | "all")
      .then((pts) =>
        setRawData(
          pts
            .filter((p) => p.ltp != null)
            .map((p) => ({ date: p.date.slice(0, 10), ltp: p.ltp as number, volume: p.volume }))
        )
      )
      .finally(() => setLoading(false));
  }, [code, apiRange]);

  // Trim for 3m/6m
  const trimmed = useMemo(() => {
    if (range === "3m") return rawData.slice(-90);
    if (range === "6m") return rawData.slice(-180);
    return rawData;
  }, [rawData, range]);

  // Compute SMA
  const data: DataPoint[] = useMemo(() => {
    const sma = computeSMA(trimmed, 20);
    return trimmed.map((d, i) => ({ ...d, sma20: sma[i] }));
  }, [trimmed]);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Price History</SectionLabel>
        <div className="flex gap-1 text-xs">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 rounded transition-colors ${
                range === r
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--primary)]"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3 mt-2">
        {loading ? (
          <div className="h-[360px] flex items-center justify-center text-xs text-[var(--text-muted)]">
            Loading chart...
          </div>
        ) : data.length === 0 ? (
          <div className="h-[360px] flex items-center justify-center text-xs text-[var(--text-muted)]">
            No price data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                tickFormatter={formatDateTick}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="price"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                tickFormatter={(v: number) => `৳${v}`}
                width={55}
              />
              <YAxis yAxisId="volume" orientation="right" hide />
              <Tooltip
                formatter={(val: number, name: string) => {
                  if (name === "volume") return [val?.toLocaleString() ?? "--", "Volume"];
                  if (name === "sma20") return [`৳${val?.toFixed(2)}`, "20-day SMA"];
                  return [`৳${val?.toFixed(2)}`, "Price"];
                }}
                labelFormatter={(label: string) => label}
                contentStyle={{ fontSize: 11, borderRadius: "6px", border: "1px solid var(--border)" }}
              />
              {/* Volume bars */}
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="var(--primary)"
                opacity={0.15}
                isAnimationActive={false}
              />
              {/* Price line */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ltp"
                stroke="var(--primary)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              {/* SMA line */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma20"
                stroke="#EC4899"
                strokeWidth={1}
                strokeDasharray="4 2"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
