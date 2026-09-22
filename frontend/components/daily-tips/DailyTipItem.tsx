import Link from "next/link";
import type { ReactNode } from "react";
import type { DailyTip } from "@/lib/api";
import StockRow, { StockPill, StockTile, type StockRowTone } from "@/components/ui/StockRow";
import {
  IconArrowDown,
  IconBell,
  IconBook,
  IconCheck,
  IconCoin,
  IconRocket,
  IconSparkle,
  IconTag,
  IconTarget,
  IconTrendUp,
} from "@/components/home/personalized/DashIcons";

// Per-signal visual identity: tone + stroked SVG icon (no emoji — they render
// differently on every phone) + chip label. Keyed by the tip's lead signal
// (`category`). Shared by the homepage teaser (compact) and /daily-tips.
const CAT_META: Record<string, { tone: StockRowTone; icon: ReactNode; tag: string }> = {
  profit_growth: { tone: "positive", icon: <IconTrendUp size={16} />, tag: "Growth" },
  profit_streak: { tone: "positive", icon: <IconCheck size={16} />, tag: "Consistent" },
  dividend_yield: { tone: "watch", icon: <IconCoin size={16} />, tag: "Dividend" },
  dividend_streak: { tone: "watch", icon: <IconCoin size={16} />, tag: "Payout Streak" },
  cheap_pe: { tone: "primary", icon: <IconTag size={16} />, tag: "Cheap vs Peers" },
  below_book: { tone: "primary", icon: <IconBook size={16} />, tag: "Below Book" },
  high_roe: { tone: "watch", icon: <IconTarget size={16} />, tag: "High Returns" },
  near_52w_low: { tone: "primary", icon: <IconArrowDown size={16} />, tag: "Near Low" },
  rel_strength: { tone: "positive", icon: <IconRocket size={16} />, tag: "Outperforming" },
  div_catalyst: { tone: "positive", icon: <IconBell size={16} />, tag: "Just Declared" },
};
const FALLBACK: { tone: StockRowTone; icon: ReactNode; tag: string } = {
  tone: "muted",
  icon: <IconSparkle size={16} />,
  tag: "Pick",
};

const TONE_VAR: Record<StockRowTone, string> = {
  positive: "var(--positive)",
  negative: "var(--negative)",
  watch: "var(--watch)",
  info: "var(--info)",
  primary: "var(--primary)",
  muted: "var(--text-muted)",
};

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
      <StockRow
        as="div"
        inset="none"
        className="hover-lift rounded-xl border border-border bg-surface px-3"
        code={tip.trading_code}
        name={tip.company_name}
        leading={<StockTile accent={TONE_VAR[meta.tone]}>{meta.icon}</StockTile>}
        sub={<span className="font-extrabold uppercase tracking-[0.07em]">{meta.tag}</span>}
        subTone={meta.tone}
        detail={<span className="line-clamp-2 text-text-main">{summary}</span>}
        trailing={facts[0] ? <StockPill tone={meta.tone}>{facts[0].value}</StockPill> : undefined}
      />
    );
  }

  return (
    <Link
      prefetch={false}
      href={`/stock/${tip.trading_code}`}
      className="hover-lift group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <span className="flex items-start gap-3.5">
        <StockTile accent={TONE_VAR[meta.tone]} className="h-10 w-10">
          {meta.icon}
        </StockTile>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="min-w-0 max-w-full truncate text-sm font-semibold leading-tight text-text-main">
              {tip.company_name || tip.trading_code}
            </span>
            {tip.company_name && (
              <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-text-muted">{tip.trading_code}</span>
            )}
            <span className={`text-xs font-extrabold uppercase tracking-[0.08em] ${
              meta.tone === "positive" ? "text-positive" : meta.tone === "watch" ? "text-watch" : meta.tone === "primary" ? "text-primary" : "text-text-muted"
            }`}>
              {meta.tag}
            </span>
            {typeof tip.conviction === "number" && tip.conviction >= 3 && (
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-text-muted">
                {tip.conviction} signals
              </span>
            )}
          </span>
          <span className="mt-1 block text-base leading-relaxed text-text-main">{summary}</span>
        </span>
      </span>

      {/* stacked fact chips */}
      {facts.length > 0 && (
        <span className="flex flex-wrap gap-2 pl-14">
          {facts.map((f, i) => (
            <StockPill key={`${f.label}-${i}`} tone={meta.tone}>
              {f.value}
            </StockPill>
          ))}
        </span>
      )}

      {/* why-it-matters explainer */}
      {tip.why && (
        <span className="block pl-14 text-sm italic leading-relaxed text-text-muted">{tip.why}</span>
      )}
    </Link>
  );
}
