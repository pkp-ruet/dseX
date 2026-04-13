"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
  LineChart, Line, LabelList,
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

    // Compute EPS YoY%
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

  const tickStyle = { fontSize: 10, fill: "var(--text-muted)" };
  const tooltipStyle = { fontSize: 11, borderRadius: "6px", border: "1px solid var(--border)" };

  return (
    <div className="mb-4">
      <SectionLabel>Financial Performance</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-4 mt-2">

        <ChartBox title="Revenue & Gross Profit" subtitle="5yr trend (&#2547;B)">
          <ResponsiveContainer width="100%" height={240}>
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

        <ChartBox title="Earnings Per Share" subtitle="5yr trend (&#2547;)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 20, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={tickStyle} />
              <YAxis tick={tickStyle} width={40} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name: string) => {
                  if (name === "EPS") return [`৳${v.toFixed(2)}`, "EPS"];
                  return [v, name];
                }}
              />
              <Bar dataKey="eps" name="EPS" fill="var(--primary)">
                <LabelList
                  dataKey="epsYoy"
                  position="top"
                  formatter={(v: number | null) => v != null ? `${v > 0 ? "+" : ""}${v.toFixed(0)}%` : ""}
                  style={{ fontSize: 9, fill: "var(--text-muted)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="NAV per Share" subtitle="5yr trend (&#2547;)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={tickStyle} />
              <YAxis tick={tickStyle} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `৳${v.toFixed(2)}`} />
              <Bar dataKey="nav" name="NAV/Share" fill="var(--safe-buy)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Return on Equity" subtitle="5yr trend (%)">
          <ResponsiveContainer width="100%" height={240}>
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

function ChartBox({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3">
      <div className="mb-2">
        <p className="text-sm font-bold text-[var(--text)]">{title}</p>
        {subtitle && <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
