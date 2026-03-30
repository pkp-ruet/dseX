"use client";
import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import SectionLabel from "@/components/ui/SectionLabel";
import { getPriceHistory } from "@/lib/api";

interface Props {
  code: string;
}

type Range = "1y" | "2y" | "all";

export default function PriceChart({ code }: Props) {
  const [range, setRange] = useState<Range>("1y");
  const [data, setData] = useState<{ date: string; ltp: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPriceHistory(code, range)
      .then((pts) =>
        setData(
          pts
            .filter((p) => p.ltp != null)
            .map((p) => ({ date: p.date.slice(0, 10), ltp: p.ltp as number }))
        )
      )
      .finally(() => setLoading(false));
  }, [code, range]);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Price History</SectionLabel>
        <div className="flex gap-1 text-xs">
          {(["1y", "2y", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 rounded transition-colors ${
                range === r
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--primary)]"
              }`}
            >
              {r === "1y" ? "1 Year" : r === "2y" ? "2 Years" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3 mt-2">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-xs text-[var(--text-muted)]">
            Loading chart...
          </div>
        ) : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-[var(--text-muted)]">
            No price data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                tickFormatter={(v: string) => v.slice(0, 7)}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                tickFormatter={(v: number) => `৳${v}`}
                width={55}
              />
              <Tooltip
                formatter={(val: number) => [`৳${val.toFixed(2)}`, "Price"]}
                labelFormatter={(label: string) => label}
                contentStyle={{ fontSize: 11, borderRadius: "6px", border: "1px solid var(--border)" }}
              />
              <Line
                type="monotone"
                dataKey="ltp"
                stroke="var(--primary)"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
