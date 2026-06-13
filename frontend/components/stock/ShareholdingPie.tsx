"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ownershipCaption } from "@/lib/plain-language";
import Card from "@/components/ui/Card";

interface Props {
  shareholding: Record<string, unknown> | null;
}

const CATEGORIES = [
  { key: "sponsor_director_pct", label: "Owners (Sponsors / Directors)", color: "var(--primary)" },
  { key: "govt_pct",             label: "Government",                    color: "#15803D" },
  { key: "institute_pct",        label: "Institutions",                  color: "#6366F1" },
  { key: "foreign_pct",          label: "Foreign Investors",             color: "#EA580C" },
  { key: "public_pct",           label: "General Public",                color: "#DB2777" },
];

export default function ShareholdingPie({ shareholding }: Props) {
  if (!shareholding) return null;

  const data = CATEGORIES
    .map((c) => ({ name: c.label, value: Number(shareholding[c.key] ?? 0), color: c.color }))
    .filter((d) => d.value > 0);

  if (data.length === 0) return null;

  const sponsorPct = Number(shareholding.sponsor_director_pct ?? 0);
  const caption = ownershipCaption(sponsorPct);

  return (
    <section className="mb-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        Who Owns It
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        Who's behind this company — and how committed are they?
      </p>

      <Card padding="none" className="rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
          <div className="shrink-0">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  strokeWidth={0}
                  isAnimationActive={true}
                  animationDuration={500}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 w-full space-y-3">
            {CATEGORIES.map((c) => {
              const val = Number(shareholding[c.key] ?? 0);
              if (val <= 0) return null;
              return (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="text-sm flex-1 min-w-0" style={{ color: "var(--text-muted)" }}>{c.label}</span>
                  <span className="text-sm font-bold tabular-nums nums w-14 text-right" style={{ color: c.color }}>
                    {val.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {caption && (
          <p className="text-sm mt-5 leading-snug" style={{ color: "var(--text-muted)" }}>
            {caption}
          </p>
        )}
      </Card>
    </section>
  );
}
