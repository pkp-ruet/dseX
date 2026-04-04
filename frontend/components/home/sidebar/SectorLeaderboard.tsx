interface SectorItem {
  name: string;
  avgScore: number;
  count: number;
}

interface Props {
  sectors: SectorItem[];
}

export default function SectorLeaderboard({ sectors }: Props) {
  if (sectors.length === 0) return null;

  const maxScore = sectors[0]?.avgScore ?? 1; // sorted desc, first is highest

  return (
    <div className="sidebar-widget">
      <div className="sidebar-widget-title">Sector Leaderboard</div>
      {sectors.map((sector) => {
        const barPct = maxScore > 0 ? (sector.avgScore / maxScore) * 100 : 0;
        return (
          <div key={sector.name} className="sector-bar-row">
            <span className="sector-bar-name" title={sector.name}>
              {sector.name}
            </span>
            <div className="sector-bar-track">
              <div
                className="sector-bar-fill"
                style={{ width: `${barPct.toFixed(1)}%` }}
              />
            </div>
            <span className="sector-bar-val">{sector.avgScore.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}
