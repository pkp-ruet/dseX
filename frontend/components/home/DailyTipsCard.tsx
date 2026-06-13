import Link from "next/link";
import type { DailyTip } from "@/lib/api";
import RecommendCard from "@/components/home/personalized/RecommendCard";

const BULB = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M9 21h6v-1H9v1zm3-20a7 7 0 0 0-4 12.7V17h8v-3.3A7 7 0 0 0 12 1z" />
  </svg>
);

interface Props {
  tips: DailyTip[];
}

// Per-signal visual identity: accent color + icon + chip label. Keyed by the
// tip's lead signal (`category`).
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
  div_catalyst: { color: "var(--strong-buy)", icon: "🔔", tag: "Just Declared" },
};
const FALLBACK = { color: "var(--text-muted)", icon: "⭐", tag: "Pick" };

export default function DailyTipsCard({ tips }: Props) {
  if (!tips || tips.length === 0) return null;

  return (
    <RecommendCard accent="#0D9488" icon={BULB} title="Daily Tips" subtitle="Fresh every day">
      <div className="flex flex-col gap-2.5">
        {tips.map((tip) => {
          const meta = CAT_META[tip.category] ?? FALLBACK;
          const facts = tip.facts ?? [];
          // Strip the leading "Name — " from the headline so the body reads as
          // the stacked facts; fall back to the full text when facts are absent.
          const summary = tip.text.includes(" — ")
            ? tip.text.slice(tip.text.indexOf(" — ") + 3)
            : tip.text;
          return (
            <Link
              key={`${tip.category}-${tip.trading_code}`}
              prefetch={false}
              href={`/stock/${tip.trading_code}`}
              className="hover-lift group relative flex flex-col gap-2 rounded-xl p-3 pl-4 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${meta.color} 8%, var(--surface)) 0%, var(--surface) 75%)`,
                border: `1px solid color-mix(in srgb, ${meta.color} 26%, var(--border))`,
              }}
            >
              {/* colored spine */}
              <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: meta.color }} />

              <span className="flex items-start gap-3">
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
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="ticker-tag text-[0.72rem]">{tip.trading_code}</span>
                    <span
                      className="text-[0.56rem] font-extrabold uppercase tracking-[0.08em]"
                      style={{ color: meta.color }}
                    >
                      {meta.tag}
                    </span>
                    {typeof tip.conviction === "number" && tip.conviction >= 3 && (
                      <span className="text-[0.56rem] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        {tip.conviction} signals
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[0.78rem] leading-snug text-[var(--text)] line-clamp-2">
                    {summary}
                  </span>
                </span>
              </span>

              {/* stacked fact chips */}
              {facts.length > 0 && (
                <span className="flex flex-wrap gap-1.5 pl-11">
                  {facts.map((f, i) => (
                    <span
                      key={`${f.label}-${i}`}
                      className="px-2 py-0.5 rounded-md text-[0.68rem] font-bold tabular-nums"
                      style={{
                        color: meta.color,
                        background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                      }}
                    >
                      {f.value}
                    </span>
                  ))}
                </span>
              )}

              {/* why-it-matters explainer */}
              {tip.why && (
                <span className="block pl-11 text-[0.68rem] leading-snug text-[var(--text-muted)] italic">
                  {tip.why}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </RecommendCard>
  );
}
