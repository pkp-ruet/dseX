import { getTier, TIER_LABELS, TIER_VAR, type TierKey } from "@/lib/constants";

interface Props {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
  /** Override the computed tier (rarely needed). */
  tier?: TierKey;
  className?: string;
}

const SIZES = {
  sm: { box: 38, stroke: 4, font: 13 },
  md: { box: 54, stroke: 5, font: 18 },
  lg: { box: 76, stroke: 6, font: 26 },
} as const;

/**
 * Signature score gauge — a tier-colored progress ring with the score centered.
 * Pure render (server-safe). Score 0–100; null renders an empty ring with "—".
 */
export default function ScoreBadge({ score, size = "md", tier, className = "" }: Props) {
  const t = tier ?? getTier(score ?? null);
  const color = TIER_VAR[t];
  const { box, stroke, font } = SIZES[size];
  const r = (box - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const dash = (pct / 100) * circ;
  const display = score == null ? "—" : Math.round(score).toString();

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: box, height: box }}
      role="img"
      aria-label={`Score ${display} out of 100, ${TIER_LABELS[t]}`}
    >
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 600ms ease-out" }}
        />
      </svg>
      <span
        className="absolute font-display nums"
        style={{ fontSize: font, fontWeight: 600, color, letterSpacing: "-0.01em" }}
      >
        {display}
      </span>
    </div>
  );
}
