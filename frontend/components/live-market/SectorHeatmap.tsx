"use client";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { LiveSectorItem } from "@/lib/api";

interface Props {
  sectors: LiveSectorItem[];
  onSectorClick?: (sector: string) => void;
}

function sectorColor(pct: number | null): string {
  if (pct == null) return "#6b7280";
  if (pct > 2) return "#16a34a";
  if (pct > 0.5) return "#4ade80";
  if (pct > 0) return "#86efac";
  if (pct > -0.5) return "#fca5a5";
  if (pct > -2) return "#f87171";
  return "#dc2626";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomContent(props: any) {
  const { x, y, width, height, name, avg_change_pct } = props;
  if (width < 30 || height < 20) return null;
  const color = sectorColor(avg_change_pct);
  const sign = (avg_change_pct ?? 0) >= 0 ? "+" : "";
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={4} ry={4} />
      {width > 60 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            fontSize={Math.min(12, width / 8)}
            fontWeight="600"
          >
            {name}
          </text>
          {avg_change_pct != null && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill="#fff"
              fontSize={Math.min(11, width / 9)}
              opacity={0.85}
            >
              {sign}{avg_change_pct.toFixed(2)}%
            </text>
          )}
        </>
      )}
    </g>
  );
}

export default function SectorHeatmap({ sectors, onSectorClick }: Props) {
  if (!sectors || sectors.length === 0) return null;

  const data = sectors
    .filter((s) => s.sector && s.sector !== "nan")
    .map((s) => ({
      name: s.sector,
      size: Math.max(s.count ?? 1, 1),
      avg_change_pct: s.avg_change_pct,
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Sector Heatmap</h3>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            content={<CustomContent />}
            onClick={(node) => {
              if (onSectorClick && node?.name) onSectorClick(node.name as string);
            }}
          >
            <Tooltip
              content={({ payload }) => {
                const d = payload?.[0]?.payload;
                if (!d) return null;
                const sign = (d.avg_change_pct ?? 0) >= 0 ? "+" : "";
                return (
                  <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs shadow">
                    <div className="font-semibold text-[var(--text)]">{d.name}</div>
                    {d.avg_change_pct != null && (
                      <div className={d.avg_change_pct >= 0 ? "text-green-500" : "text-red-500"}>
                        {sign}{d.avg_change_pct.toFixed(2)}% avg
                      </div>
                    )}
                    <div className="text-[var(--text-muted)]">{d.size} companies</div>
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#dc2626] inline-block" /> &lt;-2%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#f87171] inline-block" /> -2–0%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#86efac] inline-block" /> 0–0.5%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#16a34a] inline-block" /> &gt;2%</span>
      </div>
    </div>
  );
}
