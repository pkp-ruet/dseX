"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ownershipCaption } from "@/lib/plain-language";

interface Props {
  shareholding: Record<string, unknown> | null;
}

const CATEGORIES = [
  { key: "sponsor_director_pct", label: "Owners (Sponsors / Directors)", color: "#0EA5E9" },
  { key: "govt_pct",             label: "Government",                    color: "#34D399" },
  { key: "institute_pct",        label: "Institutions",                  color: "#818CF8" },
  { key: "foreign_pct",          label: "Foreign Investors",             color: "#FB923C" },
  { key: "public_pct",           label: "General Public",                color: "#F472B6" },
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
      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "#F1F5F9" }}>
        Who Owns It
      </h2>
      <p className="text-sm mb-5" style={{ color: "#CBD5E1" }}>
        Who's behind this company — and how committed are they?
      </p>

      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{
          background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)",
          border: "1px solid #1E3A5F",
        }}
      >
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
                    borderRadius: "8px",
                    border: "1px solid #1E3A5F",
                    background: "#0A1525",
                    color: "#F1F5F9",
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
                  <span className="text-sm flex-1 min-w-0" style={{ color: "#CBD5E1" }}>{c.label}</span>
                  <span className="text-sm font-bold tabular-nums w-14 text-right" style={{ color: c.color }}>
                    {val.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {caption && (
          <p className="text-sm mt-5 leading-snug" style={{ color: "#CBD5E1" }}>
            {caption}
          </p>
        )}
      </div>
    </section>
  );
}
