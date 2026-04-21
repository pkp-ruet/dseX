import SectionLabel from "@/components/ui/SectionLabel";
import { pillarInterpretation, SUB_METRIC_TOOLTIPS } from "@/lib/verdict";

interface Props {
  scoreRow: Record<string, number | string | null>;
}

const PILLARS = [
  {
    key: "p1_biz",
    label: "Business Quality",
    icon: "🏢",
    color: "#0EA5E9",
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
    icon: "💊",
    color: "#34D399",
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
    icon: "🏰",
    color: "#A78BFA",
    subs: [
      { key: "p3_margin", label: "Gross Margin" },
      { key: "p3_rev_vol", label: "Rev. Stability" },
      { key: "p3_sector_rank", label: "Sector Rank" },
      { key: "p3_capex", label: "CapEx" },
    ],
  },
  {
    key: "p4_val",
    label: "Valuation",
    icon: "💹",
    color: "#FB923C",
    subs: [
      { key: "p4_pe", label: "P/E Score" },
      { key: "p4_pb", label: "P/B Score" },
    ],
  },
  {
    key: "p5_div",
    label: "Dividend Quality",
    icon: "💰",
    color: "#F472B6",
    subs: [
      { key: "p5_dps_cagr", label: "DPS CAGR" },
      { key: "p5_consist", label: "Consistency" },
      { key: "p5_yield", label: "Yield Score" },
    ],
  },
];

function subScoreColor(v: number): string {
  if (v >= 8) return "#34D399";
  if (v >= 5) return "#FB923C";
  return "#F87171";
}

export default function PillarScores({ scoreRow }: Props) {
  return (
    <div className="mb-5">
      <SectionLabel>Score Pillars</SectionLabel>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
        {PILLARS.map((p) => {
          const raw = scoreRow[p.key] as number | null;
          const score10 = raw != null ? raw * 10 : 0;
          const displayScore = raw != null ? (raw * 10).toFixed(1) : "--";
          const interpretation = pillarInterpretation(p.key, raw);

          return (
            <div
              key={p.key}
              className="rounded-xl p-4"
              style={{
                background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)",
                border: `1px solid ${p.color}25`,
                boxShadow: `0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 ${p.color}10`,
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-xs font-bold" style={{ color: "#CBD5E1" }}>{p.label}</span>
                </div>
                {/* Circle score badge */}
                <div
                  className="flex items-center justify-center rounded-full text-sm font-black tabular-nums"
                  style={{
                    width: "44px",
                    height: "44px",
                    background: `${p.color}18`,
                    border: `2px solid ${p.color}50`,
                    color: p.color,
                    flexShrink: 0,
                  }}
                >
                  {displayScore}
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="h-2 rounded-full mb-3 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(score10, 100)}%`,
                    background: `linear-gradient(90deg, ${p.color} 0%, ${p.color}cc 100%)`,
                    boxShadow: `0 0 8px ${p.color}60`,
                  }}
                />
              </div>

              {/* Interpretation */}
              <p className="text-[11px] font-semibold mb-3 leading-snug" style={{ color: p.color }}>
                {interpretation}
              </p>

              {/* Sub metrics */}
              <div className="flex flex-wrap gap-1.5">
                {p.subs.map((s) => {
                  const sv = scoreRow[s.key] as number | null;
                  const tooltip = SUB_METRIC_TOOLTIPS[s.key] ?? "";
                  const c = sv != null ? subScoreColor(sv) : "#94A3B8";
                  return (
                    <span
                      key={s.key}
                      className="text-[10px] px-2 py-1 rounded-md font-semibold cursor-help"
                      title={tooltip}
                      style={{
                        background: `${c}15`,
                        color: c,
                        border: `1px solid ${c}25`,
                      }}
                    >
                      {s.label} {sv != null ? sv.toFixed(1) : "--"}
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
