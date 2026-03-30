import SectionLabel from "@/components/ui/SectionLabel";

interface Props {
  scoreRow: Record<string, number | string | null>;
}

const PILLARS = [
  {
    key: "p1_biz",
    label: "Business Quality",
    desc: "EPS consistency, CAGR, ROE, NPM trend",
    subs: [
      { key: "p1_eps_consist", label: "EPS Consistency" },
      { key: "p1_eps_cagr", label: "EPS CAGR" },
      { key: "p1_roe", label: "ROE" },
      { key: "p1_npm_trend", label: "NPM Trend" },
    ],
  },
  {
    key: "p2_health",
    label: "Financial Health",
    desc: "D/E, interest coverage, CFO quality, cash ratio",
    subs: [
      { key: "p2_de", label: "D/E" },
      { key: "p2_ic", label: "Int. Coverage" },
      { key: "p2_cfo", label: "CFO Quality" },
      { key: "p2_cash", label: "Cash/Assets" },
    ],
  },
  {
    key: "p3_moat",
    label: "Competitive Moat",
    desc: "Gross margin, revenue volatility, revenue rank",
    subs: [
      { key: "p3_margin", label: "Gross Margin" },
      { key: "p3_rev_vol", label: "Rev. Stability" },
      { key: "p3_sector_rank", label: "Revenue Rank" },
    ],
  },
  {
    key: "p4_val",
    label: "Valuation",
    desc: "P/E vs 5yr avg, P/B vs 5yr avg",
    subs: [
      { key: "p4_pe", label: "P/E Score" },
      { key: "p4_pb", label: "P/B Score" },
    ],
  },
  {
    key: "p5_div",
    label: "Dividend Quality",
    desc: "DPS CAGR, consistency, yield",
    subs: [
      { key: "p5_dps_cagr", label: "DPS CAGR" },
      { key: "p5_consist", label: "Consistency" },
      { key: "p5_yield", label: "Yield Score" },
    ],
  },
];

function subColor(v: number): string {
  if (v >= 8) return "var(--positive)";
  if (v >= 5) return "#E0A040";
  return "var(--negative)";
}

export default function PillarScores({ scoreRow }: Props) {
  return (
    <div className="mb-4">
      <SectionLabel>Score Pillars</SectionLabel>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
        {PILLARS.map((p) => {
          const raw = scoreRow[p.key] as number | null;
          const score10 = raw != null ? raw * 10 : 0; // pillar score is 0-10, bar = 0-100%
          const displayScore = raw != null ? (raw * 10).toFixed(1) : "--";
          return (
            <div key={p.key} className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{p.label}</span>
                <span className="text-xs font-bold text-[var(--primary)]">{displayScore}</span>
              </div>
              {/* Progress bar */}
              <div className="pillar-bar mb-2">
                <div
                  className="pillar-bar-fill"
                  style={{ width: `${Math.min(score10, 100)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-2">{p.desc}</p>
              {/* Sub metrics */}
              <div className="flex flex-wrap gap-1">
                {p.subs.map((s) => {
                  const sv = scoreRow[s.key] as number | null;
                  return (
                    <span
                      key={s.key}
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: sv != null ? `${subColor(sv)}22` : "#eee",
                        color: sv != null ? subColor(sv) : "#999",
                      }}
                    >
                      {s.label}: {sv != null ? sv.toFixed(1) : "--"}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
