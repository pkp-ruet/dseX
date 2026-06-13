import { getTier, TIER_LABELS, TIER_VAR, type TierKey } from "@/lib/constants";

interface Props {
  /** Pass tier directly, or a score to derive it. */
  tier?: TierKey;
  score?: number | null;
  size?: "sm" | "md";
  variant?: "soft" | "solid";
  className?: string;
}

/** Tier label as a colored pill. Soft (tinted) by default, solid (filled) optional. */
export default function TierPill({
  tier,
  score,
  size = "sm",
  variant = "soft",
  className = "",
}: Props) {
  const t = tier ?? getTier(score ?? null);
  const color = TIER_VAR[t];
  const padding = size === "md" ? "4px 12px" : "3px 9px";
  const fontSize = size === "md" ? "var(--fs-sm)" : "var(--fs-2xs)";

  const style =
    variant === "solid"
      ? { background: color, color: "#fff", padding, fontSize }
      : {
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          color,
          padding,
          fontSize,
          border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
        };

  return (
    <span
      className={`inline-flex items-center font-medium whitespace-nowrap ${className}`}
      style={{ ...style, borderRadius: 999, lineHeight: 1.2 }}
    >
      {TIER_LABELS[t]}
    </span>
  );
}
