"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { PortfolioAnalysis } from "@/lib/portfolio-analysis";
import { taka } from "@/lib/formatters";

interface Props {
  analysis: PortfolioAnalysis;
}

const COLORS = [
  "#2563EB", "#15803D", "#EA580C", "#6366F1", "#DB2777",
  "#0891B2", "#CA8A04", "#9333EA", "#DC2626", "#0D9488",
];
const OTHERS_COLOR = "#94A3B8";

type Basis = "invested" | "market";

export default function AllocationChart({ analysis }: Props) {
  const [basis, setBasis] = useState<Basis>("invested");

  const holdings = analysis.holdings;
  if (holdings.length === 0) return null;

  const raw = holdings.map((h) => {
    const invested = h.qty * h.buyPrice;
    const market = h.ltp != null ? h.qty * h.ltp : invested;
    return { code: h.code, invested, market };
  });
  const valueOf = (r: { invested: number; market: number }) =>
    basis === "invested" ? r.invested : r.market;

  const sorted = [...raw].sort((a, b) => valueOf(b) - valueOf(a));
  const total = sorted.reduce((s, r) => s + valueOf(r), 0) || 1;

  // Keep the pie readable: show top 8, fold the rest into "more".
  const TOP = 8;
  let slices: { name: string; value: number; color: string }[];
  if (sorted.length > TOP + 1) {
    const rest = sorted.slice(TOP);
    const restVal = rest.reduce((s, r) => s + valueOf(r), 0);
    slices = [
      ...sorted.slice(0, TOP).map((r, i) => ({ name: r.code, value: valueOf(r), color: COLORS[i % COLORS.length] })),
      { name: `+${rest.length} more`, value: restVal, color: OTHERS_COLOR },
    ];
  } else {
    slices = sorted.map((r, i) => ({ name: r.code, value: valueOf(r), color: COLORS[i % COLORS.length] }));
  }

  const top = sorted[0];
  const topShare = (valueOf(top) / total) * 100;
  const note =
    topShare > 25
      ? `${top.code} is ${topShare.toFixed(0)}% of your money — a big single bet. If it stumbles, the whole portfolio feels it. Spreading across more names softens that.`
      : `Your largest position is ${top.code} at ${topShare.toFixed(0)}% — a balanced split, no single stock dominates.`;

  return (
    <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6">
      {/* Header + toggle */}
      <div className="flex items-center gap-2.5 mb-1 flex-wrap">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)]">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15.9A10 10 0 1 1 8 3" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        </span>
        <h3 className="text-sm sm:text-[15px] uppercase tracking-wider font-bold text-[var(--text)]">
          Where Your Money Sits
        </h3>
        <div className="ml-auto inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
          {(["invested", "market"] as Basis[]).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBasis(b)}
              className={`px-3 py-1.5 font-semibold transition-colors ${
                basis === b
                  ? "bg-[var(--primary)] text-white"
                  : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {b === "invested" ? "Invested" : "Market value"}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-[var(--ink-2)] mb-5 leading-relaxed">
        How much of your {basis === "invested" ? "cost" : "current value"} is in each stock.
      </p>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
        {/* Donut with centered total */}
        <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={slices}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={92}
                dataKey="value"
                strokeWidth={0}
                isAnimationActive
                animationDuration={500}
              >
                {slices.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
                formatter={(v: number) => [`${taka(v, 0)} (${((v / total) * 100).toFixed(1)}%)`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
              {basis === "invested" ? "Invested" : "Value"}
            </span>
            <span className="text-base font-black text-[var(--text)] tabular-nums leading-tight">
              {taka(total, 0)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2.5">
          {slices.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-sm font-semibold flex-1 min-w-0 truncate text-[var(--text)]">
                {s.name}
              </span>
              <span className="text-sm text-[var(--text-muted)] tabular-nums">{taka(s.value, 0)}</span>
              <span className="text-sm font-black tabular-nums w-12 text-right" style={{ color: s.color }}>
                {((s.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-[var(--text-muted)] mt-5 leading-relaxed">{note}</p>
    </section>
  );
}
