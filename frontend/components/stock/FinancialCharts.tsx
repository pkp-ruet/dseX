"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, LabelList, CartesianGrid,
} from "recharts";
import SectionLabel from "@/components/ui/SectionLabel";

interface Props {
  financials: Record<string, unknown>[];
  extFinancials: Record<string, unknown>[];
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

const CARD_STYLE = {
  background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)",
  border: "1px solid #1E3A5F",
  borderRadius: "12px",
  padding: "16px",
};

const TICK = { fontSize: 10, fill: "#94A3B8" };
const TIP_STYLE = {
  fontSize: 11,
  borderRadius: "8px",
  border: "1px solid #1E3A5F",
  background: "#0A1525",
  color: "#CBD5E1",
};

export default function FinancialCharts({ financials, extFinancials }: Props) {
  const extMap = Object.fromEntries(extFinancials.map((r) => [(r as Record<string, unknown>).year, r]));

  const data = financials.map((r, i) => {
    const rec = r as Record<string, unknown>;
    const ext = (extMap[rec.year as string] || {}) as Record<string, unknown>;
    const eps = rec.eps ?? rec.eps_cont_basic ?? rec.eps_basic;
    const rev = ext.revenue;
    const gp = ext.gross_profit;
    const nav = rec.nav_per_share;
    const np = ext.net_profit ?? rec.profit_mn;
    const equity = ext.total_equity;
    const roe = toNum(np) && toNum(equity) && (toNum(equity) ?? 0) > 0
      ? ((toNum(np) as number) / (toNum(equity) as number)) * 100
      : null;

    const prevRec = i > 0 ? financials[i - 1] as Record<string, unknown> : null;
    const prevEps = prevRec ? toNum(prevRec.eps ?? prevRec.eps_cont_basic ?? prevRec.eps_basic) : null;
    const epsVal = toNum(eps);
    const epsYoy = epsVal != null && prevEps != null && prevEps !== 0
      ? ((epsVal - prevEps) / Math.abs(prevEps)) * 100
      : null;

    return {
      year: String(rec.year),
      eps: toNum(eps),
      epsYoy,
      nav: toNum(nav),
      profit: toNum(np),
      revenue: rev ? (toNum(rev) as number) / 1e3 : null,
      gross_profit: gp ? (toNum(gp) as number) / 1e3 : null,
      roe,
    };
  });

  return (
    <div className="mb-5">
      <SectionLabel>Financial Performance</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-4 mt-3">

        <ChartCard title="Revenue & Gross Profit" subtitle="৳ Billion">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#1E3A5F" strokeOpacity={0.5} />
              <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={TIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v: number) => v.toFixed(2)} />
              <Bar dataKey="revenue" name="Revenue" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gross_profit" name="Gross Profit" fill="#22D3EE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ color: "#0EA5E9", label: "Revenue" }, { color: "#22D3EE", label: "Gross Profit" }]} />
        </ChartCard>

        <ChartCard title="Earnings Per Share" subtitle="৳ per share">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 22, right: 8, left: -8, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid vertical={false} stroke="#1E3A5F" strokeOpacity={0.5} />
              <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                contentStyle={TIP_STYLE}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                formatter={(v: number, name: string) => name === "EPS" ? [`৳${v.toFixed(2)}`, "EPS"] : [v, name]}
              />
              <Bar dataKey="eps" name="EPS" fill="#818CF8" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="epsYoy"
                  position="top"
                  formatter={(v: number | null) => v != null ? `${v > 0 ? "+" : ""}${v.toFixed(0)}%` : ""}
                  style={{ fontSize: 9, fill: "#94A3B8" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ color: "#818CF8", label: "EPS (YoY% shown above)" }]} />
        </ChartCard>

        <ChartCard title="NAV per Share" subtitle="৳ per share">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid vertical={false} stroke="#1E3A5F" strokeOpacity={0.5} />
              <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={TIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v: number) => `৳${v.toFixed(2)}`} />
              <Bar dataKey="nav" name="NAV/Share" fill="#34D399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ color: "#34D399", label: "NAV per Share" }]} />
        </ChartCard>

        <ChartCard title="Return on Equity" subtitle="% annually">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#1E3A5F" strokeOpacity={0.5} />
              <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={36} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
              <Tooltip contentStyle={TIP_STYLE} cursor={{ stroke: "#1E3A5F" }} formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Line
                type="monotone"
                dataKey="roe"
                name="ROE"
                stroke="#FB923C"
                strokeWidth={2.5}
                dot={{ fill: "#FB923C", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#FB923C" }}
              />
            </LineChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ color: "#FB923C", label: "Return on Equity" }]} />
        </ChartCard>

      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={CARD_STYLE}>
      <div className="mb-3">
        <p className="text-sm font-bold" style={{ color: "#E2E8F0" }}>{title}</p>
        {subtitle && <p className="text-[10px] font-medium mt-0.5" style={{ color: "#94A3B8" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
          <span className="text-[10px] font-medium" style={{ color: "#94A3B8" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
