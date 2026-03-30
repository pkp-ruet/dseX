"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
  LineChart, Line,
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

export default function FinancialCharts({ financials, extFinancials }: Props) {
  // Merge fin + ext by year
  const extMap = Object.fromEntries(extFinancials.map((r) => [(r as Record<string, unknown>).year, r]));

  const data = financials.map((r) => {
    const rec = r as Record<string, unknown>;
    const ext = (extMap[rec.year as string] || {}) as Record<string, unknown>;
    const eps = rec.eps ?? rec.eps_cont_basic ?? rec.eps_basic;
    const rev = ext.revenue;
    const gp  = ext.gross_profit;
    const nav = rec.nav_per_share;
    const np  = ext.net_profit ?? rec.profit_mn;
    const equity = ext.total_equity;
    const roe = toNum(np) && toNum(equity) && (toNum(equity) ?? 0) > 0
      ? ((toNum(np) as number) / (toNum(equity) as number)) * 100
      : null;
    return {
      year: String(rec.year),
      eps: toNum(eps),
      nav: toNum(nav),
      profit: toNum(np),
      revenue: rev ? (toNum(rev) as number) / 1e3 : null, // → billions
      gross_profit: gp ? (toNum(gp) as number) / 1e3 : null,
      roe,
    };
  });

  const tickStyle = { fontSize: 10, fill: "var(--text-muted)" };
  const tooltipStyle = { fontSize: 11, borderRadius: "6px", border: "1px solid var(--border)" };

  return (
    <div className="mb-4">
      <SectionLabel>Financial Performance</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-4 mt-2">

        {/* Revenue & Gross Profit */}
        <ChartBox title="Revenue & Gross Profit (৳B)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={tickStyle} />
              <YAxis tick={tickStyle} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toFixed(2)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="revenue" name="Revenue" fill="var(--primary)" opacity={0.8} />
              <Bar dataKey="gross_profit" name="Gross Profit" fill="var(--accent)" opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* EPS */}
        <ChartBox title="Earnings Per Share (৳)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={tickStyle} />
              <YAxis tick={tickStyle} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `৳${v.toFixed(2)}`} />
              <Bar dataKey="eps" name="EPS" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* NAV per share */}
        <ChartBox title="NAV per Share (৳)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={tickStyle} />
              <YAxis tick={tickStyle} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `৳${v.toFixed(2)}`} />
              <Bar dataKey="nav" name="NAV/Share" fill="var(--safe-buy)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* ROE */}
        <ChartBox title="Return on Equity (%)">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={tickStyle} />
              <YAxis tick={tickStyle} width={40} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Line type="monotone" dataKey="roe" name="ROE" stroke="var(--accent)" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
    </div>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3">
      <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">{title}</p>
      {children}
    </div>
  );
}
