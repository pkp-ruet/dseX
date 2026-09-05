import type { DailyTip } from "@/lib/api";

// Per-signal accent + icon + short label, mirroring DailyTipsCard's CAT_META
// but trimmed for the compact teaser rows.
const CAT_META: Record<string, { color: string; icon: string; tag: string }> = {
  profit_growth: { color: "var(--positive)", icon: "📈", tag: "Growth" },
  profit_streak: { color: "var(--positive)", icon: "✅", tag: "Consistent" },
  dividend_yield: { color: "var(--watch)", icon: "💰", tag: "Dividend" },
  dividend_streak: { color: "var(--watch)", icon: "🔁", tag: "Payout Streak" },
  cheap_pe: { color: "var(--primary)", icon: "🏷️", tag: "Cheap vs Peers" },
  below_book: { color: "var(--primary)", icon: "📘", tag: "Below Book" },
  high_roe: { color: "var(--np-cautious)", icon: "⚙️", tag: "High Returns" },
  near_52w_low: { color: "var(--accent)", icon: "📉", tag: "Near Low" },
  rel_strength: { color: "var(--positive)", icon: "🚀", tag: "Outperforming" },
  div_catalyst: { color: "var(--tier-excellent)", icon: "🔔", tag: "Just Declared" },
};
const FALLBACK = { color: "var(--text-muted)", icon: "⭐", tag: "Pick" };

/** Compact teaser of the Daily Tips card — same soft-card footprint as the
 *  other feature mockups. The full card lives in the logged-in dashboard. */
export default function DailyTipsMockup({ tips }: { tips: DailyTip[] }) {
  if (!tips || tips.length === 0) return null;
  const rows = tips.slice(0, 3);

  return (
    <div className="soft-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">💡 Today&apos;s tips</span>
        <span className="text-[0.68rem] text-[var(--text-muted)]">fresh every day</span>
      </div>

      <div className="divide-y divide-[var(--cell-rule)]">
        {rows.map((tip) => {
          const meta = CAT_META[tip.category] ?? FALLBACK;
          const fact = tip.facts?.[0];
          return (
            <div key={`${tip.category}-${tip.trading_code}`} className="flex items-center gap-3 px-4 py-3">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[0.85rem] shrink-0"
                style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}
                aria-hidden="true"
              >
                {meta.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="ticker-tag ticker-tag--static text-[0.8rem]">{tip.trading_code}</span>
                <span
                  className="block text-[0.68rem] font-bold uppercase tracking-[0.08em]"
                  style={{ color: meta.color }}
                >
                  {meta.tag}
                </span>
              </span>
              {fact && (
                <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: meta.color }}>
                  {fact.value}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
