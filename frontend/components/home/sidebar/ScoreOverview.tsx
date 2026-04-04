import { formatDate } from "@/lib/formatters";

interface Props {
  counts: Record<string, number>;
  total: number;
  computedAt: string;
}

const TIERS = [
  { key: "strong_buy",    label: "Strong Buy",    fillClass: "score-bar-fill-strong"        },
  { key: "good_buy",      label: "Good Buy",      fillClass: "score-bar-fill-good"          },
  { key: "safe_buy",      label: "Safe Buy",      fillClass: "score-bar-fill-safe"          },
  { key: "cautious_buy",  label: "Cautious Buy",  fillClass: "score-bar-fill-cautious"      },
  { key: "keep_watching", label: "Keep Watching", fillClass: "score-bar-fill-keep-watching" },
  { key: "avoid",         label: "Avoid",         fillClass: "score-bar-fill-avoid"         },
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
