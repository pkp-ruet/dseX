"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import SectionLabel from "@/components/ui/SectionLabel";
import { formatDate } from "@/lib/formatters";

interface Props {
  shareholding: Record<string, unknown> | null;
}

const CATEGORIES = [
  { key: "sponsor_director_pct", label: "Sponsor/Director", color: "#0EA5E9" },
  { key: "govt_pct",             label: "Government",        color: "#34D399" },
  { key: "institute_pct",        label: "Institutional",     color: "#818CF8" },
  { key: "foreign_pct",          label: "Foreign",           color: "#FB923C" },
  { key: "public_pct",           label: "General Public",    color: "#F472B6" },
];

export default function ShareholdingPie({ shareholding }: Props) {
  if (!shareholding) return null;

  const data = CATEGORIES
    .map((c) => ({ name: c.label, value: Number(shareholding[c.key] ?? 0), color: c.color }))
    .filter((d) => d.value > 0);

  const asOf = shareholding.as_of_date as string | null;
  const sponsorPct = Number(shareholding.sponsor_director_pct ?? 0);
  const sponsorTag = sponsorPct > 50 ? "High Confidence" : sponsorPct < 20 ? "Low Alignment" : null;
  const sponsorTagColor = sponsorPct > 50 ? "#34D399" : "#F87171";

  return (
    <div className="mb-5">
      <SectionLabel>Shareholding Pattern</SectionLabel>

      <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
        {asOf && (
          <span className="text-[10px] font-medium" style={{ color: "#94A3B8" }}>
            As of {formatDate(asOf)}
          </span>
        )}
        {sponsorTag && (
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: `${sponsorTagColor}15`,
              color: sponsorTagColor,
              border: `1px solid ${sponsorTagColor}30`,
            }}
          >
            {sponsorTag}
          </span>
        )}
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)", border: "1px solid #1E3A5F" }}
      >
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          {/* Pie chart */}
          <div className="shrink-0">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: "8px", border: "1px solid #1E3A5F", background: "#0A1525", color: "#CBD5E1" }}
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with bars */}
          <div className="flex-1 w-full space-y-3">
            {CATEGORIES.map((c) => {
              const val = Number(shareholding[c.key] ?? 0);
              return (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="text-xs w-32 shrink-0" style={{ color: "#94A3B8" }}>{c.label}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(val, 100)}%`,
                        background: c.color,
                        boxShadow: `0 0 6px ${c.color}60`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color: c.color }}>
                    {val.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
