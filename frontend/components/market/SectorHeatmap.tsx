"use client";
import { useRouter } from "next/navigation";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { sectorSlug } from "@/lib/sector";

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
  /** Slugs that actually have a `/sector/[slug]` page. When a tile's sector is in
   *  here and no `onSectorClick` is given, clicking it opens that page. Passing
   *  the list (rather than assuming) keeps tiles for unscored groups — mutual
   *  funds, tiny sectors — from linking to a 404. */
  pageSlugs?: string[];
}

/** Heat ramp from the two locked market tokens, mixed toward the surface for the
 *  softer stops; flat / unknown sectors take the muted ink. Legend uses the same
 *  function so the swatches can never drift from the tiles. */
const mix = (token: string, pct: number) => `color-mix(in srgb, var(${token}) ${pct}%, var(--surface))`;
const FLAT = "var(--text-muted)";

function sectorColor(pct: number | null): string {
  if (pct == null) return FLAT;
  if (pct > 2) return mix("--positive", 100);
  if (pct > 0.5) return mix("--positive", 60);
  if (pct > 0) return mix("--positive", 30);
  if (pct > -0.5) return mix("--negative", 30);
  if (pct > -2) return mix("--negative", 60);
  return mix("--negative", 100);
}

/** Light tiles (30% mixes) need dark text; the saturated ones take surface-white. */
function tileInk(pct: number | null): string {
  if (pct == null) return "var(--surface)";
  return Math.abs(pct) > 0.5 || pct === 0 ? "var(--surface)" : "var(--text)";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomContent(props: any) {
  const { x, y, width, height, name, avg_change_pct } = props;
  if (width < 30 || height < 20) return null;
  const color = sectorColor(avg_change_pct);
  const ink = tileInk(avg_change_pct);
  const sign = (avg_change_pct ?? 0) >= 0 ? "+" : "";
  // SVG text never clips to its tile, so "Pharmaceuticals & Chemicals" bled across
  // neighbours on phones. Ellipsise the name to what fits (~0.6em per glyph).
  const nameSize = Math.min(12, width / 8);
  const maxChars = Math.floor((width - 10) / (nameSize * 0.6));
  const label: string =
    typeof name === "string" && name.length > maxChars
      ? maxChars > 3
        ? `${name.slice(0, maxChars - 1)}…`
        : ""
      : (name ?? "");
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={6} ry={6} stroke="var(--surface)" strokeWidth={2} />
      {width > 60 && height > 30 && (
        <>
          {label && (
            <text
              x={x + width / 2}
              y={y + height / 2 - 6}
              textAnchor="middle"
              fill={ink}
              fontSize={nameSize}
              fontWeight="700"
            >
              {label}
            </text>
          )}
          {avg_change_pct != null && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill={ink}
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

export default function SectorHeatmap({
  sectors,
  onSectorClick,
  withHeader = true,
  pageSlugs,
}: Props) {
  const router = useRouter();
  if (!sectors || sectors.length === 0) return null;

  const linkable = new Set(pageSlugs ?? []);

  function handleClick(name?: string) {
    if (!name) return;
    if (onSectorClick) {
      onSectorClick(name);
      return;
    }
    const slug = sectorSlug(name);
    if (linkable.has(slug)) router.push(`/sector/${slug}`);
  }

  const data = sectors
    .filter((s) => s.sector && s.sector !== "nan")
    .map((s) => ({
      name: s.sector,
      size: Math.max(s.count ?? 1, 1),
      avg_change_pct: s.avg_change_pct,
    }));

  if (data.length === 0) return null;

  const legend: { c: string; label: string }[] = [
    { c: sectorColor(-3), label: "< -2%" },
    { c: sectorColor(-1), label: "-2 to 0%" },
    { c: sectorColor(0.25), label: "0 to 0.5%" },
    { c: sectorColor(1), label: "0.5 to 2%" },
    { c: sectorColor(3), label: "> 2%" },
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
              onClick={(node) => handleClick(node?.name as string | undefined)}
              style={{ cursor: onSectorClick || linkable.size ? "pointer" : "default" }}
            >
              <Tooltip
                content={({ payload }) => {
                  const d = payload?.[0]?.payload;
                  if (!d) return null;
                  const sign = (d.avg_change_pct ?? 0) >= 0 ? "+" : "";
                  return (
                    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-soft">
                      <div className="font-bold text-text-main">{d.name}</div>
                      {d.avg_change_pct != null && (
                        <div className={`font-semibold tabular-nums ${d.avg_change_pct >= 0 ? "text-positive" : "text-negative"}`}>
                          {sign}{d.avg_change_pct.toFixed(2)}% avg
                        </div>
                      )}
                      <div className="text-text-muted">{d.size} companies</div>
                    </div>
                  );
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-text-muted">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: l.c }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
