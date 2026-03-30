"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import SectionLabel from "@/components/ui/SectionLabel";
import { millions } from "@/lib/formatters";

interface Props {
  extFinancials: Record<string, unknown>[];
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export default function CashFlowPanel({ extFinancials }: Props) {
  const data = extFinancials.map((r) => {
    const rec = r as Record<string, unknown>;
    const cfo = toNum(rec.operating_cf);
    const np  = toNum(rec.net_profit);
    const capex = toNum(rec.capex);
    const fcf = cfo != null && capex != null ? cfo - Math.abs(capex) : null;
    return {
      year: String(rec.year),
      cfo: cfo ? cfo / 1e6 : null,   // → millions
      np: np ? np / 1e6 : null,
      fcf: fcf ? fcf / 1e6 : null,
    };
  });

  // Latest CFO quality
  const latest = extFinancials[extFinancials.length - 1] as Record<string, unknown> | undefined;
  const latestCfo = latest ? toNum(latest.operating_cf) : null;
  const latestNp  = latest ? toNum(latest.net_profit) : null;
  const latestCapex = latest ? toNum(latest.capex) : null;
  const latestFcf = latestCfo != null && latestCapex != null
    ? latestCfo - Math.abs(latestCapex)
    : null;
  const cfoRatio = latestCfo != null && latestNp && latestNp !== 0
    ? latestCfo / latestNp
    : null;
  const cfoColor =
    cfoRatio == null ? "var(--text-muted)" :
    cfoRatio > 1.0 ? "var(--positive)" :
    cfoRatio > 0.7 ? "#E0A040" :
    "var(--negative)";

  const tickStyle = { fontSize: 10, fill: "var(--text-muted)" };
  const tooltipStyle = { fontSize: 11, borderRadius: "6px", border: "1px solid var(--border)" };

  return (
    <div className="mb-4">
      <SectionLabel>Cash Flow Quality</SectionLabel>
      <div className="grid sm:grid-cols-3 gap-4 mt-2">
        <div className="sm:col-span-2 rounded-[var(--radius)] border border-[var(--border)] bg-white p-3">
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
            Operating CF vs Net Profit (৳M)
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={tickStyle} />
              <YAxis tick={tickStyle} width={50} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `৳${v.toFixed(1)}M`} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="cfo" name="Operating CF" fill="var(--primary)" opacity={0.85} />
              <Bar dataKey="np" name="Net Profit" fill="var(--accent)" opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-[var(--text-muted)]">CF Metrics</p>
          <div>
            <p className="text-xs text-[var(--text-muted)]">CFO / Net Profit</p>
            <p className="text-sm font-bold" style={{ color: cfoColor }}>
              {cfoRatio != null ? cfoRatio.toFixed(2) : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Free Cash Flow</p>
            <p className="text-sm font-bold">{latestFcf != null ? millions(latestFcf) : "--"}</p>
          </div>
          {latestCfo && (
            <div>
              <p className="text-xs text-[var(--text-muted)]">Operating CF</p>
              <p className="text-sm font-bold">{millions(latestCfo)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
