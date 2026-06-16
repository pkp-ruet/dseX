"use client";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

export interface SectorHeatmapItem {
  sector: string;
  avg_change_pct: number | null;
  count: number | null;
}

interface Props {
  sectors: SectorHeatmapItem[];
  onSectorClick?: (sector: string) => void;
  /** Render the section-rule header above the card. Default true. */
  withHeader?: boolean;
}

function sectorColor(pct: number | null): string {
  if (pct == null) return "#a8a29e";
  if (pct > 2) return "#047857";
  if (pct > 0.5) return "#22c55e";
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
      <rect x={x} y={y} width={width} height={height} fill={color} rx={6} ry={6} stroke="var(--surface)" strokeWidth={2} />
      {width > 60 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={Math.min(12, width / 8)}
            fontWeight="700"
          >
            {name}
          </text>
          {avg_change_pct != null && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill="#ffffff"
              fontSize={Math.min(11, width / 9)}
              fontWeight="600"
              opacity={0.92}
            >
              {sign}{avg_change_pct.toFixed(2)}%
            </text>
          )}
        </>
      )}
    </g>
  );
}

export default function SectorHeatmap({ sectors, onSectorClick, withHeader = true }: Props) {
  if (!sectors || sectors.length === 0) return null;

  const data = sectors
    .filter((s) => s.sector && s.sector !== "nan")
    .map((s) => ({
      name: s.sector,
      size: Math.max(s.count ?? 1, 1),
      avg_change_pct: s.avg_change_pct,
    }));

  if (data.length === 0) return null;

  const legend: { c: string; label: string }[] = [
    { c: "#dc2626", label: "< -2%" },
    { c: "#f87171", label: "-2 to 0%" },
    { c: "#86efac", label: "0 to 0.5%" },
    { c: "#047857", label: "> 2%" },
  ];

  return (
    <section className="mb-6">
      {withHeader && (
        <div className="section-rule-modern">
          <span className="section-rule-text">Sector Heatmap</span>
        </div>
      )}

      <div className="soft-card p-4">
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
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs shadow-[var(--shadow-soft)]">
                      <div className="font-bold text-[var(--text)]">{d.name}</div>
                      {d.avg_change_pct != null && (
                        <div className="font-semibold tabular-nums" style={{ color: d.avg_change_pct >= 0 ? "var(--positive)" : "var(--negative)" }}>
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

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-medium text-[var(--text-muted)]">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: l.c }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
