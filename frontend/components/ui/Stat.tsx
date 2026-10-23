import type { ReactNode } from "react";

type Tone = "default" | "positive" | "negative" | "watch" | "muted" | "primary";
type Size = "sm" | "md" | "lg" | "xl";

const TONE: Record<Tone, string> = {
  default: "text-text-main",
  positive: "text-positive",
  negative: "text-negative",
  watch: "text-watch",
  muted: "text-text-muted",
  primary: "text-primary-ink",
};

const VALUE_SIZE: Record<Size, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl sm:text-3xl",
  xl: "text-3xl sm:text-4xl",
};

/**
 * THE number tile (2026-10 redesign, step 0): the number first and biggest,
 * a plain label under it, an optional toned line under that. Tabular digits,
 * so a row of Stats lines up. No box of its own — put Stats inside a Card or
 * a grid; the number is the visual.
 *
 * Format the value before passing it (`money()`, `changePct()`, `pct()`), so
 * every number on the site prints one way.
 */
export default function Stat({
  value,
  label,
  sub,
  tone = "default",
  subTone = "muted",
  size = "md",
  align = "start",
  className = "",
}: {
  value: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  subTone?: Tone;
  size?: Size;
  align?: "start" | "end" | "center";
  className?: string;
}) {
  const alignCls = align === "end" ? "items-end text-right" : align === "center" ? "items-center text-center" : "items-start";
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${alignCls} ${className}`.trim()}>
      <span className={`nums font-bold leading-none ${VALUE_SIZE[size]} ${TONE[tone]}`}>{value}</span>
      <span className="text-xs font-semibold text-text-muted">{label}</span>
      {sub && <span className={`nums text-xs font-semibold ${TONE[subTone]}`}>{sub}</span>}
    </div>
  );
}
