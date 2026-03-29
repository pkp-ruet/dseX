"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SectionLabel from "@/components/ui/SectionLabel";
import { formatDate } from "@/lib/formatters";

interface Props {
  shareholding: Record<string, unknown> | null;
}

const CATEGORIES = [
  { key: "sponsor_director_pct", label: "Sponsor/Director", color: "#1A6B5A" },
  { key: "govt_pct",             label: "Government",        color: "#4CAF7D" },
  { key: "institute_pct",        label: "Institutional",     color: "#1A4D6B" },
  { key: "foreign_pct",          label: "Foreign",           color: "#7A5C00" },
  { key: "public_pct",           label: "General Public",    color: "#E07A5F" },
];

export default function ShareholdingPie({ shareholding }: Props) {
  if (!shareholding) return null;

  const data = CATEGORIES
    .map((c) => ({ name: c.label, value: Number(shareholding[c.key] ?? 0), color: c.color }))
    .filter((d) => d.value > 0);

  const asOf = shareholding.as_of_date as string | null;
  const sponsorPct = Number(shareholding.sponsor_director_pct ?? 0);
  const sponsorTag =
    sponsorPct > 50 ? "High Confidence" :
    sponsorPct < 20 ? "Low Alignment" :
    null;

  return (
    <div className="mb-4">
      <SectionLabel>Shareholding Pattern</SectionLabel>
      <div className="flex flex-wrap items-center gap-2 mt-1 mb-2 text-xs">
        {asOf && (
          <span className="text-[var(--text-muted)]">As of {formatDate(asOf)}</span>
        )}
        {sponsorTag && (
          <span
            className="px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: sponsorPct > 50 ? "#DCFCE7" : "#FEE2E2",
              color: sponsorPct > 50 ? "#166534" : "#991B1B",
            }}
          >
            {sponsorTag}
          </span>
        )}
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3">
        <div className="flex flex-wrap gap-6 items-center">
          <ResponsiveContainer width={200} height={180}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={75} dataKey="value">
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex-1 space-y-1.5">
            {CATEGORIES.map((c) => {
              const val = Number(shareholding[c.key] ?? 0);
              return (
                <div key={c.key} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: c.color }}
                  />
                  <span className="text-xs text-[var(--text-muted)] w-32">{c.label}</span>
                  <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(val, 100)}%`, background: c.color }}
                    />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{val.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
