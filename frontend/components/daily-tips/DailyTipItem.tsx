import Link from "next/link";
import type { DailyTip } from "@/lib/api";

// Per-signal visual identity: accent color + icon + chip label. Keyed by the
// tip's lead signal (`category`). Shared by the homepage teaser (compact) and
// the full /daily-tips page.
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

export default function DailyTipItem({
  tip,
  compact = false,
}: {
  tip: DailyTip;
  /** Tight, space-saving layout for the homepage teaser. */
  compact?: boolean;
}) {
  const meta = CAT_META[tip.category] ?? FALLBACK;
  const facts = tip.facts ?? [];
  // Strip the leading "Name — " from the headline so the body reads as the
  // stacked facts; fall back to the full text when facts are absent.
  const summary = tip.text.includes(" — ")
    ? tip.text.slice(tip.text.indexOf(" — ") + 3)
    : tip.text;

  if (compact) {
    return (
      <Link
        prefetch={false}
        href={`/stock/${tip.trading_code}`}
        className="hover-lift group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
      >
        <span
          className="shrink-0 grid place-items-center w-8 h-8 rounded-lg text-base"
          style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}
        >
          {meta.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="ticker-tag text-[0.8rem]">{tip.trading_code}</span>
            <span
              className="text-[0.68rem] font-extrabold uppercase tracking-[0.07em]"
              style={{ color: meta.color }}
            >
              {meta.tag}
            </span>
            {facts[0] && (
              <span
                className="ml-auto shrink-0 px-2 py-0.5 rounded-md text-[0.72rem] font-bold tabular-nums"
                style={{
                  color: meta.color,
                  background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                }}
              >
                {facts[0].value}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[0.82rem] leading-snug text-[var(--text)] line-clamp-2">
            {summary}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      prefetch={false}
      href={`/stock/${tip.trading_code}`}
      className="hover-lift group flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <span className="flex items-start gap-3.5">
        {/* icon medallion */}
        <span
          className="shrink-0 grid place-items-center w-10 h-10 rounded-lg text-lg"
          style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}
        >
          {meta.icon}
        </span>

        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="ticker-tag text-[0.85rem]">{tip.trading_code}</span>
            <span
              className="text-[0.7rem] font-extrabold uppercase tracking-[0.08em]"
              style={{ color: meta.color }}
            >
              {meta.tag}
            </span>
            {typeof tip.conviction === "number" && tip.conviction >= 3 && (
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {tip.conviction} signals
              </span>
            )}
          </span>
          <span className="mt-1 block text-[0.95rem] leading-relaxed text-[var(--text)]">
            {summary}
          </span>
        </span>
      </span>

      {/* stacked fact chips */}
      {facts.length > 0 && (
        <span className="flex flex-wrap gap-2 pl-[3.25rem]">
          {facts.map((f, i) => (
            <span
              key={`${f.label}-${i}`}
              className="px-2.5 py-1 rounded-md text-[0.82rem] font-bold tabular-nums"
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
        <span className="block pl-[3.25rem] text-[0.82rem] leading-relaxed text-[var(--text-muted)] italic">
          {tip.why}
        </span>
      )}
    </Link>
  );
}
