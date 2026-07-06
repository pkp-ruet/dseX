import {
  SIGNAL_LABELS,
  SIGNAL_LABELS_BN,
  SIGNAL_VAR,
  type AnySignalKind,
} from "@/lib/constants";

interface Props {
  /** buy | hold | sell (stock) or buy_more | hold | sell (holding). null/undefined/"none" renders nothing. */
  signal: AnySignalKind | "none" | null | undefined;
  /** Plain-language one-liner — shown as a hover tooltip. */
  reason?: string | null;
  size?: "sm" | "md";
  lang?: "en" | "bn";
  /** Dim the chip when the signal is a data-poor fallback. */
  muted?: boolean;
  className?: string;
}

/**
 * The Buy / Hold / Sell action chip — renders the backend-computed signal
 * (single source of truth). Visual counterpart to TierPill: the pill says
 * what the company IS (fundamental strength), this chip says what to DO.
 * When shown together, put TierPill first, SignalChip second.
 */
export default function SignalChip({
  signal,
  reason,
  size = "sm",
  lang = "en",
  muted = false,
  className = "",
}: Props) {
  if (!signal || signal === "none") return null;
  const color = muted ? "var(--text-muted)" : SIGNAL_VAR[signal];
  const label = lang === "bn" ? SIGNAL_LABELS_BN[signal] : SIGNAL_LABELS[signal];
  const glyph = signal === "sell" ? "▼" : signal === "hold" ? "●" : "▲";

  return (
    <span
      title={reason ?? undefined}
      className={`inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-wide whitespace-nowrap ${
        reason ? "cursor-help" : ""
      } ${lang === "bn" ? "font-bn normal-case" : ""} ${className}`}
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
        padding: size === "md" ? "4px 12px" : "2px 8px",
        fontSize: size === "md" ? "0.8rem" : "0.62rem",
        opacity: muted ? 0.75 : 1,
      }}
    >
      <span aria-hidden style={{ fontSize: size === "md" ? "10px" : "8px", lineHeight: 1 }}>
        {glyph}
      </span>
      {label}
    </span>
  );
}
