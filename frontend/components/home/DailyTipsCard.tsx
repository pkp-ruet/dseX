import Link from "next/link";
import type { DailyTip } from "@/lib/api";

interface Props {
  tips: DailyTip[];
}

// Per-category visual identity: accent color + icon + chip label.
const CAT_META: Record<
  string,
  { color: string; icon: string; tag: string; positive: boolean }
> = {
  top_overall: { color: "var(--primary)", icon: "🏆", tag: "Top Rated", positive: false },
  profit_growth: { color: "var(--positive)", icon: "📈", tag: "Growth", positive: true },
  dividend: { color: "var(--watch)", icon: "💰", tag: "Dividend", positive: true },
  high_eps: { color: "var(--np-cautious)", icon: "⚡", tag: "Earnings", positive: false },
};
const FALLBACK = { color: "var(--text-muted)", icon: "⭐", tag: "Pick", positive: false };

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
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">💡</span>
        <span className="text-sm font-extrabold text-[var(--text)]">Daily TopStockBD Tips</span>
        <span className="ml-1 h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      <div className="flex flex-col gap-2.5">
        {tips.map((tip) => {
          const meta = CAT_META[tip.category] ?? FALLBACK;
          const metric = fmtMetric(tip);
          return (
            <Link
              key={`${tip.category}-${tip.trading_code}`}
              href={`/stock/${tip.trading_code}`}
              className="hover-lift group relative flex items-center gap-3 rounded-xl p-3 pl-4 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${meta.color} 8%, var(--surface)) 0%, var(--surface) 75%)`,
                border: `1px solid color-mix(in srgb, ${meta.color} 26%, var(--border))`,
              }}
            >
              {/* colored spine */}
              <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: meta.color }} />
              {/* icon medallion */}
              <span
                className="shrink-0 grid place-items-center w-8 h-8 rounded-lg text-sm"
                style={{
                  background: `color-mix(in srgb, ${meta.color} 16%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${meta.color} 30%, transparent)`,
                }}
              >
                {meta.icon}
              </span>

              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="ticker-tag text-[0.72rem]">{tip.trading_code}</span>
                  <span
                    className="text-[0.56rem] font-extrabold uppercase tracking-[0.08em]"
                    style={{ color: meta.color }}
                  >
                    {meta.tag}
                  </span>
                </span>
                <span className="mt-0.5 block text-[0.78rem] leading-snug text-[var(--text-muted)] line-clamp-1">
                  {tip.text}
                </span>
              </span>

              {metric && (
                <span
                  className="shrink-0 px-2 py-1 rounded-md text-[0.72rem] font-extrabold tabular-nums"
                  style={{
                    color: meta.color,
                    background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                  }}
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
