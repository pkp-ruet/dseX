import {
  SIGNAL_LABELS,
  SIGNAL_LABELS_BN,
  SIGNAL_VAR,
  STRONG_BUY_LABEL,
  STRONG_BUY_LABEL_BN,
  type AnySignalKind,
} from "@/lib/constants";

interface Props {
  /** buy | sell (stock) or buy_more | sell (holding). null / undefined / "none" renders nothing. */
  signal: AnySignalKind | "none" | null | undefined;
  /** Conviction for a buy: "strong" renders "Strong Buy" as a filled chip. */
  strength?: "strong" | "normal" | null;
  /** Plain-language one-liner — shown as a hover tooltip. */
  reason?: string | null;
  /** sm = 12px (rows, cards) · md = 13px (the verdict, holding heads). */
  size?: "sm" | "md";
  lang?: "en" | "bn";
  /** Dim the chip when the signal is a data-poor fallback. */
  muted?: boolean;
  className?: string;
}

/** Stroked glyphs (no emoji, no text glyph that Android may swap for one). */
function Glyph({ kind }: { kind: "up" | "down" | "star" }) {
  const common = { width: 10, height: 10, viewBox: "0 0 24 24", "aria-hidden": true, fill: "currentColor" } as const;
  if (kind === "up") return <svg {...common}><path d="M12 4 21 19H3z" /></svg>;
  if (kind === "down") return <svg {...common}><path d="M12 20 3 5h18z" /></svg>;
  return (
    <svg {...common}>
      <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3 6.1 20.5l1.3-6.5L2.5 9.4l6.6-.8z" />
    </svg>
  );
}

/**
 * THE action chip — renders the backend-computed Buy / Strong Buy / Sell
 * signal (single source of truth; the frontend never derives advice). One
 * visual grammar everywhere: Strong Buy = filled positive, Buy / Buy More =
 * tinted positive, Sell = tinted negative. Neutral (`none`) renders nothing —
 * there is no "Hold". Visual counterpart to TierPill: the pill says what the
 * company IS, this chip says what to DO. Shown together, TierPill goes first.
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
  if (!signal || signal === "none") return null;

  const isSell = signal === "sell";
  const isStrong = signal === "buy" && strength === "strong";
  const color = muted ? "var(--text-muted)" : SIGNAL_VAR[signal];
  const label = isStrong
    ? lang === "bn"
      ? STRONG_BUY_LABEL_BN
      : STRONG_BUY_LABEL
    : lang === "bn"
      ? SIGNAL_LABELS_BN[signal]
      : SIGNAL_LABELS[signal];

  const bg = isStrong ? color : `color-mix(in srgb, ${color} 12%, transparent)`;
  const textColor = isStrong ? "var(--surface)" : color;
  const border = isStrong ? color : `color-mix(in srgb, ${color} 28%, transparent)`;

  return (
    <span
      title={reason ?? undefined}
      className={`inline-flex items-center gap-1 rounded-md font-bold whitespace-nowrap leading-tight ${
        reason ? "cursor-help" : ""
      } ${lang === "bn" ? "font-bn" : "uppercase tracking-wide"} ${className}`}
      lang={lang === "bn" ? "bn" : undefined}
      style={{
        color: textColor,
        background: bg,
        border: `1px solid ${border}`,
        padding: size === "md" ? "4px 12px" : "2px 8px",
        fontSize: size === "md" ? "var(--fs-xs)" : "var(--fs-2xs)",
        opacity: muted ? 0.75 : 1,
      }}
    >
      <Glyph kind={isSell ? "down" : isStrong ? "star" : "up"} />
      {label}
    </span>
  );
}
