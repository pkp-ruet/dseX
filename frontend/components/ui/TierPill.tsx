import { getTier, TIER_LABELS, TIER_LABELS_BN, TIER_VAR, type TierKey } from "@/lib/constants";

interface Props {
  /** Pass tier directly, or a score to derive it. */
  tier?: TierKey;
  score?: number | null;
  /** sm = 12px (table rows, list chips) · md = 13px (card heads, the verdict). */
  size?: "sm" | "md";
  variant?: "soft" | "solid";
  lang?: "en" | "bn";
  className?: string;
}

/**
 * THE tier rendering — the fundamental-strength word (Excellent / Good /
 * Average / Weak) as a tier-coloured pill. Soft (12% tint) by default, solid
 * optional. No other component hand-rolls a tier pill; pair it with
 * `ScoreBadge` for the number and `SignalChip` for the action.
 */
export default function TierPill({
  tier,
  score,
  size = "sm",
  variant = "soft",
  lang = "en",
  className = "",
}: Props) {
  const t = tier ?? getTier(score ?? null);
  const color = TIER_VAR[t];
  const padding = size === "md" ? "4px 12px" : "3px 9px";
  const fontSize = size === "md" ? "var(--fs-xs)" : "var(--fs-2xs)";

  const style =
    variant === "solid"
      ? { background: color, color: "var(--surface)", padding, fontSize, border: `1px solid ${color}` }
      : {
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          color,
          padding,
          fontSize,
          border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
        };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap leading-tight ${
        lang === "bn" ? "font-bn" : ""
      } ${className}`}
      lang={lang === "bn" ? "bn" : undefined}
      style={style}
    >
      {lang === "bn" ? TIER_LABELS_BN[t] : TIER_LABELS[t]}
    </span>
  );
}
