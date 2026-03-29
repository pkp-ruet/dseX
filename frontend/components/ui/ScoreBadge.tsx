import { getTier, TIER_COLORS } from "@/lib/constants";

interface Props {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
}

export default function ScoreBadge({ score, size = "md" }: Props) {
  const tier = getTier(score);
  const color = TIER_COLORS[tier];
  const sizeClass = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-lg px-3 py-1.5",
  }[size];

  return (
    <span
      className={`score-pill font-bold ${sizeClass}`}
      style={{ color, border: `1.5px solid ${color}`, background: `${color}18` }}
    >
      {score != null ? score.toFixed(1) : "--"}
    </span>
  );
}
