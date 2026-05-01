import Link from "next/link";
import type { ScoreItem } from "@/lib/api";
import { getTier, TIER_LABELS, TIER_COLORS } from "@/lib/constants";
import { PILLAR_META, pillarColor } from "@/lib/insight-utils";

interface InsightCardProps {
  rank: number;
  item: ScoreItem;
  insight: string;
}

export default function InsightCard({ rank, item, insight }: InsightCardProps) {
  const tier = getTier(item.score);
  const tierLabel = TIER_LABELS[tier];
  const tierColor = TIER_COLORS[tier];

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)]">

      {/* Header row */}
      <div className="flex items-start gap-3">
        <span className="text-sm font-mono text-[var(--ink-muted)] w-6 shrink-0 pt-0.5">
          #{rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/stock/${item.trading_code}`}
              className="text-base font-bold hover:opacity-80 transition-opacity"
              style={{ color: "#60A5FA" }}
            >
              {item.trading_code}
            </Link>
            {item.sector && (
              <span className="text-xs text-[var(--ink-muted)] border border-[var(--border)] rounded-full px-2.5 py-0.5">
                {item.sector}
              </span>
            )}
            <span
              className="text-xs font-bold rounded-full px-2.5 py-0.5"
              style={{ color: tierColor, border: `1px solid ${tierColor}55`, background: `${tierColor}18` }}
            >
              {tierLabel}
            </span>
          </div>
          {item.company_name && (
            <p className="mt-1 text-sm text-[var(--ink)]">{item.company_name}</p>
          )}
        </div>
        {item.score != null && (
          <span
            className="text-xl font-bold shrink-0"
            style={{ color: tierColor }}
          >
            {item.score.toFixed(1)}
          </span>
        )}
      </div>

      {/* Insight text */}
      <p className="text-sm text-[var(--ink)] leading-relaxed border-l-2 border-[var(--primary)] pl-3">
        {insight}
      </p>

      {/* Pillar bars */}
      <div className="space-y-2.5">
        {PILLAR_META.map(({ key, label }) => {
          const val = item[key] as number | null | undefined;
          const pct = val != null ? Math.min(100, (val / 10) * 100) : 0;
          const color = pillarColor(val);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-[var(--ink-muted)] w-28 sm:w-32 shrink-0">{label}</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs font-mono font-semibold w-10 text-right shrink-0" style={{ color }}>
                {val != null ? val.toFixed(1) : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Metrics row */}
      <div className="pt-2 border-t border-[var(--border)] space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[var(--ink-muted)]">
          {item.ltp != null && (
            <span>LTP <span className="text-[var(--ink)] font-bold">৳{item.ltp.toFixed(1)}</span></span>
          )}
          {item.change_pct != null && (
            <span className="font-semibold" style={{ color: item.change_pct >= 0 ? "#4ADE80" : "#F87171" }}>
              {item.change_pct >= 0 ? "▲" : "▼"} {Math.abs(item.change_pct).toFixed(2)}%
            </span>
          )}
          {item.eps_yoy_pct != null && (
            <span>
              EPS{" "}
              <span className="font-semibold" style={{ color: item.eps_yoy_pct >= 0 ? "#4ADE80" : "#F87171" }}>
                {item.eps_yoy_pct >= 0 ? "▲" : "▼"} {Math.abs(item.eps_yoy_pct).toFixed(1)}%
              </span>
            </span>
          )}
          {item.div_yield_pct != null && item.div_yield_pct > 0 && (
            <span>Dividend <span className="text-[var(--ink)] font-bold">{item.div_yield_pct.toFixed(1)}%</span></span>
          )}
        </div>
        <Link
          href={`/stock/${item.trading_code}`}
          className="inline-block text-sm font-semibold text-[var(--primary)] hover:underline"
        >
          View full analysis →
        </Link>
      </div>

    </div>
  );
}
