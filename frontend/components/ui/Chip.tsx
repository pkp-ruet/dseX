import Link from "next/link";
import type { ReactNode } from "react";

/**
 * THE chip (2026-10 redesign, step 0). Two jobs:
 * - a filter or choice (`onClick` or `href`, with `active`) — 40px tall, the
 *   app's touch-target floor;
 * - a small static label (no handler) — compact, for tags inside rows.
 *
 * Neutral by default. A tone is for meaning only (up/down, a warning), never
 * for decoration. Market words keep their own primitives: SignalChip, TierPill.
 */
type Tone = "neutral" | "positive" | "negative" | "watch" | "info";

const TONE: Record<Tone, string> = {
  neutral: "border-border bg-surface text-text-main",
  positive: "border-positive/30 bg-positive/10 text-positive",
  negative: "border-negative/30 bg-negative/10 text-negative",
  watch: "border-watch/30 bg-watch/10 text-watch",
  info: "border-info/30 bg-info/10 text-info-ink",
};

export default function Chip({
  children,
  active = false,
  onClick,
  href,
  tone = "neutral",
  icon,
  className = "",
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const interactive = !!(onClick || href);
  const base = interactive
    ? "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors active:scale-[0.98]"
    : "inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold";
  const look = active
    ? "border-text-main bg-text-main text-surface"
    : `${TONE[tone]} ${interactive ? "hover:border-text-muted" : ""}`;
  const cls = `${base} ${look} ${className}`.trim();
  const inner = (
    <>
      {icon && <span className="inline-flex shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls} aria-current={active ? "page" : undefined} aria-label={ariaLabel}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} aria-pressed={active} aria-label={ariaLabel}>
        {inner}
      </button>
    );
  }
  return <span className={cls}>{inner}</span>;
}
