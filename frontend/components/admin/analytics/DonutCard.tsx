"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TOOLTIP_STYLE } from "./shared";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

/** Reusable donut + legend card (adoption breakdown, signup source). */
export default function DonutCard({
  title,
  slices,
}: {
  title: string;
  slices: DonutSlice[];
}) {
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((a, s) => a + s.value, 0);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5">
      <h3 className="text-sm font-bold text-[var(--text)] mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-8 text-center">No data yet.</p>
      ) : (
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="shrink-0">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={68}
                  dataKey="value"
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {data.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number, n: string) => [`${v} (${total ? ((v / total) * 100).toFixed(0) : 0}%)`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            {data.map((s) => (
              <div key={s.name} className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-xs flex-1 min-w-0 truncate text-[var(--text-muted)]">{s.name}</span>
                <span className="text-xs font-bold tabular-nums text-[var(--text)]">{s.value}</span>
                <span className="text-[11px] tabular-nums w-9 text-right text-[var(--text-muted)]">
                  {total ? `${((s.value / total) * 100).toFixed(0)}%` : "0%"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
