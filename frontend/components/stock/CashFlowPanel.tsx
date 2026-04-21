"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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

const TICK = { fontSize: 10, fill: "#94A3B8" };
const TIP_STYLE = {
  fontSize: 11,
  borderRadius: "8px",
  border: "1px solid #1E3A5F",
  background: "#0A1525",
  color: "#CBD5E1",
};

export default function CashFlowPanel({ extFinancials }: Props) {
  const data = extFinancials.map((r) => {
    const rec = r as Record<string, unknown>;
    const cfo = toNum(rec.operating_cf);
    const np  = toNum(rec.net_profit);
    const capex = toNum(rec.capex);
    const fcf = cfo != null && capex != null ? cfo - Math.abs(capex) : null;
    return {
      year: String(rec.year),
      cfo: cfo ? cfo / 1e6 : null,
      np: np ? np / 1e6 : null,
      fcf: fcf ? fcf / 1e6 : null,
    };
  });

  const latest = extFinancials[extFinancials.length - 1] as Record<string, unknown> | undefined;
  const latestCfo = latest ? toNum(latest.operating_cf) : null;
  const latestNp  = latest ? toNum(latest.net_profit) : null;
  const latestCapex = latest ? toNum(latest.capex) : null;
  const latestFcf = latestCfo != null && latestCapex != null ? latestCfo - Math.abs(latestCapex) : null;
  const cfoRatio = latestCfo != null && latestNp && latestNp !== 0 ? latestCfo / latestNp : null;
  const cfoColor =
    cfoRatio == null ? "#94A3B8" :
    cfoRatio > 1.0 ? "#34D399" :
    cfoRatio > 0.7 ? "#FB923C" :
    "#F87171";

  return (
    <div className="mb-5">
      <SectionLabel>Cash Flow Quality</SectionLabel>
      <div className="grid sm:grid-cols-3 gap-4 mt-3">

        <div
          className="sm:col-span-2 rounded-xl p-4"
          style={{ background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)", border: "1px solid #1E3A5F" }}
        >
          <p className="text-xs font-bold mb-3" style={{ color: "#94A3B8" }}>
            Operating CF vs Net Profit (৳M)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#1E3A5F" strokeOpacity={0.5} />
              <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={TIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v: number) => `৳${v.toFixed(1)}M`} />
              <Bar dataKey="cfo" name="Operating CF" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="np" name="Net Profit" fill="#818CF8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#0EA5E9" }} />
              <span className="text-[10px] font-medium" style={{ color: "#94A3B8" }}>Operating CF</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#818CF8" }} />
              <span className="text-[10px] font-medium" style={{ color: "#94A3B8" }}>Net Profit</span>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-4 flex flex-col gap-4"
          style={{ background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)", border: "1px solid #1E3A5F" }}
        >
          <p className="text-xs font-bold" style={{ color: "#94A3B8" }}>CF Metrics</p>

          <CfMetric
            label="CFO / Net Profit"
            value={cfoRatio != null ? cfoRatio.toFixed(2) : "--"}
            color={cfoColor}
            desc={cfoRatio != null ? (cfoRatio > 1 ? "Strong cash conversion" : cfoRatio > 0.7 ? "Moderate" : "Weak cash conversion") : undefined}
          />
          <CfMetric
            label="Free Cash Flow"
            value={latestFcf != null ? millions(latestFcf) : "--"}
            color={latestFcf != null && latestFcf > 0 ? "#34D399" : "#F87171"}
          />
          {latestCfo != null && (
            <CfMetric
              label="Operating CF"
              value={millions(latestCfo)}
              color={latestCfo > 0 ? "#0EA5E9" : "#F87171"}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CfMetric({ label, value, color, desc }: { label: string; value: string; color: string; desc?: string }) {
  return (
    <div
      className="px-3 py-2.5 rounded-xl"
      style={{ background: `${color}10`, border: `1px solid ${color}20` }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#94A3B8" }}>{label}</p>
      <p className="text-xl font-black tabular-nums" style={{ color }}>{value}</p>
      {desc && <p className="text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>{desc}</p>}
    </div>
  );
}
