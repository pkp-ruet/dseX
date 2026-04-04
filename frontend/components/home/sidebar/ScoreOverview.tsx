import { formatDate } from "@/lib/formatters";

interface Props {
  counts: Record<string, number>;
  total: number;
  computedAt: string;
}

const TIERS = [
  { key: "strong_buy", label: "Strong Buy", fillClass: "score-bar-fill-strong" },
  { key: "safe_buy",   label: "Safe Buy",   fillClass: "score-bar-fill-safe"   },
  { key: "watch",      label: "Watch",      fillClass: "score-bar-fill-watch"  },
  { key: "avoid",      label: "Avoid",      fillClass: "score-bar-fill-avoid"  },
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
    </div>
  );
}
