import type { SectorStrengthItem } from "@/lib/api";
import { pct } from "@/lib/formatters";

interface Props {
  sectors: SectorStrengthItem[];
  condition: string;
  fullWidth?: boolean;
  titleColor?: string;
}

export default function SectorMap({ sectors, condition, fullWidth = true, titleColor }: Props) {
  if (!sectors || sectors.length === 0) return null;

  const maxAbs = Math.max(...sectors.map((s) => Math.abs(s.avg_change_pct)), 0.1);

  const title =
    condition === "falling"
      ? "Sector Fortress — Least Damage"
      : condition === "rising"
      ? "Sector Rotation — Leading Sectors"
      : "Sector Snapshot";

  const desc =
    condition === "falling"
      ? "Sectors losing the least. Consider rotating into defensives."
      : condition === "rising"
      ? "Sectors leading the rally. Money is flowing here."
      : "Sector performance in a flat market.";

  return (
    <div className={`intel-signal-card${fullWidth ? " intel-signal-card--full" : ""}`}>
      <div className="intel-signal-title" style={titleColor ? { color: titleColor } : undefined}>{title}</div>
      <div className="intel-signal-desc">{desc}</div>
      <div className="intel-sector-grid">
        {sectors.map((s) => {
          const isPos = s.avg_change_pct >= 0;
          const barPct = Math.min((Math.abs(s.avg_change_pct) / maxAbs) * 100, 100);
          return (
            <div key={s.sector} className="intel-sector-row">
              <span className="intel-sector-name">{s.sector}</span>
              <div className="intel-sector-bar-track">
                <div
                  className={`intel-sector-bar-fill--${isPos ? "pos" : "neg"}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <span
                className="intel-sector-val"
                style={{ color: isPos ? "var(--positive)" : "var(--negative)" }}
              >
                {isPos ? "+" : ""}{pct(s.avg_change_pct)}
              </span>
              <span className="intel-sector-count">{s.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
