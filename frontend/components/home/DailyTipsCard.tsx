import Link from "next/link";
import type { DailyTip } from "@/lib/api";

interface Props {
  tips: DailyTip[];
}

// Categories where the metric chip reads as a positive signal (green).
const POSITIVE_METRIC = new Set(["profit_growth", "dividend"]);

function fmtMetric(tip: DailyTip): string | null {
  if (tip.metric_value == null || !tip.metric_label) return null;
  switch (tip.category) {
    case "profit_growth":
      return `+${tip.metric_value}%`;
    case "dividend":
      return `${tip.metric_value}% yield`;
    case "high_eps":
      return `EPS ${tip.metric_value}`;
    case "top_overall":
      return `${tip.metric_value}/100`;
    default:
      return `${tip.metric_value}`;
  }
}

export default function DailyTipsCard({ tips }: Props) {
  if (!tips || tips.length === 0) return null;

  return (
    <section aria-label="TopStockBD Tips">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="w-1 h-4 rounded-full bg-[var(--primary)] shrink-0 self-center" />
          <span className="text-sm font-extrabold text-[var(--text)]">Daily TopStockBD Tips</span>
        </div>
      </div>

      <div className="soft-card overflow-hidden divide-y divide-[var(--cell-rule)]">
        {tips.map((tip) => {
          const metric = fmtMetric(tip);
          const positive = POSITIVE_METRIC.has(tip.category);
          return (
            <Link
              key={`${tip.category}-${tip.trading_code}`}
              href={`/stock/${tip.trading_code}`}
              className="hover-lift flex items-center gap-3 px-4 py-3"
            >
              <span className="ticker-tag text-[0.72rem] shrink-0">{tip.trading_code}</span>
              <span className="flex-1 min-w-0 text-[0.82rem] leading-snug text-[var(--text)]">
                {tip.text}
              </span>
              {metric && (
                <span
                  className="shrink-0 px-2 py-0.5 rounded-md text-[0.7rem] font-bold tabular-nums"
                  style={
                    positive
                      ? { color: "var(--positive)", background: "color-mix(in srgb, var(--positive) 12%, transparent)" }
                      : { color: "var(--text-muted)", background: "var(--surface-2)" }
                  }
                >
                  {metric}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
