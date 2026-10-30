import {
  SIGNAL_LABELS,
  SIGNAL_LABELS_BN,
  SIGNAL_VAR,
  type AnySignalKind,
} from "@/lib/constants";
import { T } from "@/components/i18n/T";

interface Props {
  /** buy | sell (stock) or buy_more | sell (holding). null / undefined / "none" renders nothing. */
  signal: AnySignalKind | "none" | null | undefined;
  /** Ignored since 2026-10-31 ("Strong buy" was retired; the price word says it,
   *  `ui/PriceWord.tsx`). Kept so old callers compile. */
  strength?: "strong" | "normal" | null;
  /** Plain-language one-liner — shown as a hover tooltip. */
  reason?: string | null;
  /** sm = 12px (rows, cards) · md = 13px (the verdict, holding heads). */
  size?: "sm" | "md";
  /** Ignored — the label follows the page language (`<T>`). Kept so old callers compile. */
  lang?: "en" | "bn";
  /** Dim the chip when the signal is a data-poor fallback. */
  muted?: boolean;
  className?: string;
}

/** Stroked glyphs (no emoji, no text glyph that Android may swap for one). */
function Glyph({ kind }: { kind: "up" | "down" }) {
  const common = { width: 10, height: 10, viewBox: "0 0 24 24", "aria-hidden": true, fill: "currentColor" } as const;
  if (kind === "up") return <svg {...common}><path d="M12 4 21 19H3z" /></svg>;
  return <svg {...common}><path d="M12 20 3 5h18z" /></svg>;
}

/**
 * THE action chip — renders the backend-computed Buy / Sell signal (single
 * source of truth; the frontend never derives advice). One visual grammar
 * everywhere: Buy / Buy More = tinted positive, Sell = tinted negative. There
 * is no "Strong buy" since 2026-10-31: `ui/PriceWord.tsx` says how low the
 * price is where a page needs it. Neutral (`none`) renders nothing —
 * there is no "Hold". Visual counterpart to TierPill: the pill says what the
 * company IS, this chip says what to DO. Shown together, TierPill goes first.
 */
export default function SignalChip({
  signal,
  reason,
  size = "sm",
  muted = false,
  className = "",
}: Props) {
  if (!signal || signal === "none") return null;

  const isSell = signal === "sell";
  const color = muted ? "var(--text-muted)" : SIGNAL_VAR[signal];
  const labelEn = SIGNAL_LABELS[signal];
  const labelBn = SIGNAL_LABELS_BN[signal];

  const bg = `color-mix(in srgb, ${color} 12%, transparent)`;
  const textColor = color;
  const border = `color-mix(in srgb, ${color} 28%, transparent)`;

  return (
    <span
      title={reason ?? undefined}
      className={`inline-flex items-center gap-1 rounded-md font-bold whitespace-nowrap leading-tight ${
        reason ? "cursor-help" : ""
      } ${className}`}
      style={{
        color: textColor,
        background: bg,
        border: `1px solid ${border}`,
        padding: size === "md" ? "4px 12px" : "2px 8px",
        fontSize: size === "md" ? "var(--fs-xs)" : "var(--fs-2xs)",
        opacity: muted ? 0.75 : 1,
      }}
    >
      <Glyph kind={isSell ? "down" : "up"} />
      {/* Uppercase is an English-only treatment; Bengali has no case. */}
      <T en={<span className="uppercase tracking-wide">{labelEn}</span>} bn={labelBn} />
    </span>
  );
}
