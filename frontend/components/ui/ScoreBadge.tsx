import { getTier, TIER_LABELS, TIER_VAR, type TierKey } from "@/lib/constants";

interface Props {
  score: number | null | undefined;
  /** sm = table rows and list chips (36px) · md = card heads (54px) · lg = the verdict hero (132px, "/100" caption). */
  size?: "sm" | "md" | "lg";
  /** Override the computed tier (rarely needed). */
  tier?: TierKey;
  className?: string;
}

const SIZES = {
  sm: { box: 36, stroke: 4, text: "text-xs" },
  md: { box: 54, stroke: 5, text: "text-lg" },
  lg: { box: 132, stroke: 10, text: "text-4xl" },
} as const;

/**
 * THE score rendering — a tier-coloured ring with the 0–100 number centred.
 * Every score in the app goes through this (rank table, peer table, sector
 * cards, holdings, the verdict hero); nothing prints `score/100` as text.
 * Pure render (server-safe). Null renders an empty ring with "—".
 * The arc's draw transition lives in app/styles/misc.css (`.score-ring-arc`)
 * and is switched off under prefers-reduced-motion.
 */
export default function ScoreBadge({ score, size = "md", tier, className = "" }: Props) {
  const t = tier ?? getTier(score ?? null);
  const color = TIER_VAR[t];
  const { box, stroke, text } = SIZES[size];
  const r = (box - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const dash = (pct / 100) * circ;
  const display = score == null ? "—" : Math.round(score).toString();

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: box, height: box }}
      role="img"
      aria-label={`Score ${display} out of 100, ${TIER_LABELS[t]}`}
    >
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="-rotate-90" aria-hidden>
        <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          className="score-ring-arc"
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`font-display font-bold tabular-nums nums tracking-tight ${text}`} style={{ color }}>
          {display}
        </span>
        {size === "lg" && (
          <span className="mt-1 text-xs font-bold uppercase tracking-widest text-text-muted">/ 100</span>
        )}
      </span>
    </div>
  );
}
