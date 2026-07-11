import {
  SIGNAL_LABELS,
  SIGNAL_LABELS_BN,
  SIGNAL_VAR,
  STRONG_BUY_LABEL,
  STRONG_BUY_LABEL_BN,
  type AnySignalKind,
} from "@/lib/constants";

interface Props {
  /** buy | sell (stock) or buy_more | sell (holding). null/undefined/"none" renders nothing.
   *  Sell is intentionally NOT shown in the UI (kept in the backend for now). */
  signal: AnySignalKind | "none" | null | undefined;
  /** Conviction for a buy: "strong" renders "Strong Buy" with a bolder chip. */
  strength?: "strong" | "normal" | null;
  /** Plain-language one-liner — shown as a hover tooltip. */
  reason?: string | null;
  size?: "sm" | "md";
  lang?: "en" | "bn";
  /** Dim the chip when the signal is a data-poor fallback. */
  muted?: boolean;
  className?: string;
}

/**
 * The Buy / Strong Buy action chip — renders the backend-computed signal
 * (single source of truth). Visual counterpart to TierPill: the pill says
 * what the company IS (fundamental strength), this chip says what to DO.
 * When shown together, put TierPill first, SignalChip second.
 *
 * We currently surface only Buy and Strong Buy. Sell (and neutral `none`) render
 * nothing — the sell logic still exists in the backend and will be shown later.
 */
export default function SignalChip({
  signal,
  strength = null,
  reason,
  size = "sm",
  lang = "en",
  muted = false,
  className = "",
}: Props) {
  // Hide neutral and sell signals from the UI.
  if (!signal || signal === "none" || signal === "sell") return null;

  const isStrong = signal === "buy" && strength === "strong";
  const color = muted ? "var(--text-muted)" : SIGNAL_VAR[signal];
  const label = isStrong
    ? lang === "bn"
      ? STRONG_BUY_LABEL_BN
      : STRONG_BUY_LABEL
    : lang === "bn"
      ? SIGNAL_LABELS_BN[signal]
      : SIGNAL_LABELS[signal];

  // Strong Buy = solid fill so it stands out from a plain (outlined) Buy.
  const bg = isStrong
    ? color
    : `color-mix(in srgb, ${color} 12%, transparent)`;
  const textColor = isStrong ? "#fff" : color;
  const border = isStrong
    ? color
    : `color-mix(in srgb, ${color} 28%, transparent)`;

  return (
    <span
      title={reason ?? undefined}
      className={`inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-wide whitespace-nowrap ${
        reason ? "cursor-help" : ""
      } ${lang === "bn" ? "font-bn normal-case" : ""} ${className}`}
      style={{
        color: textColor,
        background: bg,
        border: `1px solid ${border}`,
        padding: size === "md" ? "4px 12px" : "2px 8px",
        fontSize: size === "md" ? "0.8rem" : "0.62rem",
        opacity: muted ? 0.75 : 1,
      }}
    >
      <span aria-hidden style={{ fontSize: size === "md" ? "10px" : "8px", lineHeight: 1 }}>
        {isStrong ? "★" : "▲"}
      </span>
      {label}
    </span>
  );
}
