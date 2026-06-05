"use client";
import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend,
} from "recharts";
import ChartCard from "@/components/stock/ChartCard";
import {
  normalizeExtFinancials, revenueSeries, marginSeries, debtEquitySeries, cashQualitySeries,
} from "@/lib/stock-metrics";

interface Props {
  extFinancials: Record<string, unknown>[];
}

const TICK = { fontSize: 11, fill: "#64748B" };
const TIP_STYLE = {
  fontSize: 12,
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
};

function fmtMn(v: number | null | undefined): string {
  if (v == null) return "--";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}৳${(abs / 1000).toFixed(1)}B`;
  return `${sign}৳${Math.round(abs)}M`;
}

export default function FinancialTrends({ extFinancials }: Props) {
  const [open, setOpen] = useState(false);

  const rows = normalizeExtFinancials(extFinancials);
  if (rows.length < 2) return null;

  const revenue = revenueSeries(rows);
  const margins = marginSeries(rows);
  const debtEq = debtEquitySeries(rows);
  const cashQ = cashQualitySeries(rows);

  const hasRevenue = revenue.some((d) => d.value != null);
  const hasMargins = margins.some((d) => d.gross != null || d.net != null);
  const hasDebtEq = debtEq.some((d) => d.debt != null || d.equity != null);
  const hasCashQ = cashQ.some((d) => d.value != null);

  if (!hasRevenue && !hasMargins && !hasDebtEq && !hasCashQ) return null;

  // Captions
  const firstRev = revenue.find((d) => d.value != null)?.value ?? null;
  const lastRev = [...revenue].reverse().find((d) => d.value != null)?.value ?? null;
  const revCap =
    firstRev != null && lastRev != null
      ? lastRev > firstRev * 1.1 ? "Sales have grown over this period."
        : lastRev < firstRev * 0.9 ? "Sales have shrunk over this period."
        : "Sales have stayed roughly flat."
      : null;

  const lastNet = [...margins].reverse().find((d) => d.net != null)?.net ?? null;
  const marginCap = lastNet != null ? `Keeps about ৳${(lastNet / 100).toFixed(2)} as profit from every ৳1 of sales.` : null;

  const lastDe = [...debtEq].reverse().find((d) => d.de != null)?.de ?? null;
  const deCap = lastDe != null ? `Carries about ৳${lastDe.toFixed(1)} of debt for every ৳1 of equity.` : null;

  const lastCq = [...cashQ].reverse().find((d) => d.value != null)?.value ?? null;
  const cqCap =
    lastCq != null
      ? lastCq >= 0.8 ? `Turns reported profit into real cash (${lastCq.toFixed(1)}× of profit).`
        : `Earns only ৳${lastCq.toFixed(1)} of real cash per ৳1 of reported profit — worth a closer look.`
      : null;

  return (
    <section className="mb-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left mb-1"
        aria-expanded={open}
      >
        <span className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>
          Financial Trends
        </span>
        <span
          className="text-sm font-semibold flex items-center gap-1"
          style={{ color: "var(--primary)" }}
        >
          {open ? "Hide" : "Show"}
          <span className="transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} aria-hidden="true">▾</span>
        </span>
      </button>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        The deeper numbers — revenue, margins, debt and cash quality over the years.
      </p>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hasRevenue && (
            <ChartCard title="Revenue" subtitle="Yearly sales" caption={revCap}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenue} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={TIP_STYLE} formatter={(v: number) => [fmtMn(v), "Revenue"]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {hasMargins && (
            <ChartCard title="Profit Margins" subtitle="Gross & net %" caption={marginCap}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={margins} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} width={32} unit="%" />
                  <Tooltip contentStyle={TIP_STYLE} formatter={(v: number, n: string) => [`${v.toFixed(1)}%`, n === "gross" ? "Gross" : "Net"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === "gross" ? "Gross margin" : "Net margin")} />
                  <Line type="monotone" dataKey="gross" stroke="#15803D" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
                  <Line type="monotone" dataKey="net" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {hasDebtEq && (
            <ChartCard title="Debt vs Equity" subtitle="Balance-sheet strength" caption={deCap}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={debtEq} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={TIP_STYLE} formatter={(v: number, n: string) => [fmtMn(v), n === "debt" ? "Debt" : "Equity"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="equity" radius={[6, 6, 0, 0]} fill="#15803D" />
                  <Bar dataKey="debt" radius={[6, 6, 0, 0]} fill="#DC2626" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {hasCashQ && (
            <ChartCard title="Cash-Flow Quality" subtitle="Cash vs reported profit" caption={cqCap}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cashQ} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={TIP_STYLE} formatter={(v: number) => [`${v.toFixed(2)}×`, "CF / profit"]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {cashQ.map((d, i) => (
                      <Cell key={i} fill={(d.value ?? 0) >= 0.8 ? "#15803D" : "#B45309"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}
    </section>
  );
}
