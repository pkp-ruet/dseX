import Link from "next/link";
import { formatDate } from "@/lib/formatters";

interface Props {
  counts: Record<string, number>;
  total: number;
  computedAt: string;
}

const TIERS = [
  { key: "excellent", label: "Excellent", fillClass: "score-bar-fill-excellent" },
  { key: "good",      label: "Good",      fillClass: "score-bar-fill-good"      },
  { key: "average",   label: "Average",   fillClass: "score-bar-fill-average"   },
  { key: "weak",      label: "Weak",      fillClass: "score-bar-fill-weak"      },
] as const;

export default function ScoreOverview({ counts, total, computedAt }: Props) {
  return (
    <div className="sidebar-widget">
      <div className="sidebar-widget-title">Score Overview</div>
      <p style={{ fontSize: "0.68rem", color: "var(--ink-muted)", marginBottom: "10px" }}>
        {total} companies · DSEF Score
      </p>
      {TIERS.map(({ key, label, fillClass }) => {
        const n = counts[key] ?? 0;
        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
        return (
          <div key={key} className="score-bar-row">
            <span className="score-bar-label">{label}</span>
            <div className="score-bar-track">
              <div
                className={`score-bar-fill ${fillClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="score-bar-count">{n} ({pct}%)</span>
          </div>
        );
      })}
      <div className="sidebar-widget-footer">Updated {formatDate(computedAt)}</div>
      <Link href="/dsestockranking" className="score-overview-rank-btn">
        View Full Rankings →
      </Link>
    </div>
  );
}
