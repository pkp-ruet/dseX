import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { changePct, changeTone, money } from "@/lib/formatters";

/**
 * THE stock row — the one grammar every list and card in the app uses to show
 * a stock, so a reader who learns it once on the dashboard reads the ranking,
 * the movers, the dividend board and the market-analysis lists the same way.
 *
 *   [leading]  Company Name  CODE [mark] [tags]        ৳price   [trailing] [action]
 *              sub line (kind word / reason, toned)    +1.23%
 *              detail line(s) (dates, extra facts)
 *
 * - Company NAME leads (a first-time reader knows "Grameenphone", not "GP");
 *   the ticker code is small beside it and drops under it on a narrow phone.
 * - Price is `money()`; the change is `changePct()` coloured by `changeTone()`.
 *   Nothing else in the app prints a price or a day change by hand.
 * - The whole row is a link to `/stock/<code>` (`href={null}` for a static row).
 *   `trailing` sits INSIDE the link (non-interactive: TierPill, ScoreBadge,
 *   SignalChip, a meta pill); `action` sits OUTSIDE it (interactive: StarButton)
 *   so a button never nests inside an anchor.
 * - Min height 56px (48px for `size="sm"`), hover + active states, tokens only.
 */

export type StockRowTone = "positive" | "negative" | "watch" | "info" | "primary" | "muted";

export const TONE_TEXT: Record<StockRowTone, string> = {
  positive: "text-positive",
  negative: "text-negative",
  watch: "text-watch",
  info: "text-info",
  primary: "text-primary",
  muted: "text-text-muted",
};

export interface StockRowProps {
  code: string;
  name?: string | null;
  /** Slot before the name: a `StockRank` chip, a sector tile, an icon tile. */
  leading?: ReactNode;
  /** Owner tag right after the code (`OwnerMark` / `PersonalMark`). */
  mark?: ReactNode;
  /** Small chips on the identity line (TierPill, SignalChip, "New"). */
  tags?: ReactNode;
  /** ONE line under the name — a kind word or a plain reason. */
  sub?: ReactNode;
  subTone?: StockRowTone;
  /** Let `sub` run to two lines instead of truncating (reasons, sentences). */
  subClamp?: boolean;
  /** Extra muted line(s) under `sub` (dates, cash, facts). */
  detail?: ReactNode;
  /** Last price → `money()`. Omit both `price` and `right` for no right column. */
  price?: number | null;
  /** Day change in % → `changePct()` + `changeTone()`. null/undefined hides the line. */
  change?: number | null;
  /** Replaces the price/change stack (use `StockRowValue` to keep the shape). */
  right?: ReactNode;
  /** Non-interactive far-right slot, inside the link. */
  trailing?: ReactNode;
  /** Interactive far-right slot, outside the link (StarButton). ≥40px target. */
  action?: ReactNode;
  /** Defaults to `/stock/<code>`; `null` renders a static row. */
  href?: string | null;
  lang?: "en" | "bn";
  size?: "md" | "sm";
  /** `card` = the dashboard card gutter (px-4 sm:px-5); `bleed` = hover bg bleeds
   *  10px past the text (market-analysis cards); `none` = flush. */
  inset?: "card" | "bleed" | "none";
  as?: "li" | "div";
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const INSET: Record<NonNullable<StockRowProps["inset"]>, string> = {
  card: "px-4 sm:px-5",
  bleed: "stock-row--bleed",
  none: "",
};

export default function StockRow({
  code,
  name,
  leading,
  mark,
  tags,
  sub,
  subTone = "muted",
  subClamp = false,
  detail,
  price,
  change,
  right,
  trailing,
  action,
  href,
  lang = "en",
  size = "md",
  inset = "card",
  as: Tag = "li",
  className = "",
  style,
  title,
}: StockRowProps) {
  const bn = lang === "bn";
  const to = href === undefined ? `/stock/${code}` : href;
  const hasRight = right !== undefined || price !== undefined;
  const minH = size === "sm" ? "min-h-12 py-1.5" : "min-h-14 py-2";
  const innerClass = `flex min-w-0 flex-1 items-center gap-3 ${minH} ${INSET[inset]}`;

  const body = (
    <>
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="min-w-0 max-w-full truncate text-sm font-semibold leading-tight text-text-main">
            {name || code}
          </span>
          {name && (
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-text-muted">{code}</span>
          )}
          {mark}
          {tags}
        </span>
        {sub && (
          <span
            className={`mt-0.5 block text-xs leading-snug ${TONE_TEXT[subTone]} ${
              subClamp ? "line-clamp-2" : "truncate"
            }`}
          >
            {sub}
          </span>
        )}
        {detail && <span className="mt-0.5 block text-xs leading-snug text-text-muted">{detail}</span>}
      </span>
      {hasRight && (
        <span className="shrink-0 text-right">
          {right !== undefined ? (
            right
          ) : (
            <>
              <span className="block text-sm font-semibold tabular-nums nums text-text-main">{money(price)}</span>
              {change != null && (
                <span className={`block text-xs font-semibold tabular-nums nums ${changeTone(change)}`}>
                  {changePct(change)}
                </span>
              )}
            </>
          )}
        </span>
      )}
      {trailing && <span className="flex shrink-0 items-center">{trailing}</span>}
    </>
  );

  return (
    <Tag
      className={`flex items-stretch transition-colors hover:bg-surface-2 active:bg-surface-2 ${
        bn ? "font-bn" : ""
      } ${className}`}
      lang={bn ? "bn" : undefined}
      style={style}
      title={title}
    >
      {to ? (
        <Link prefetch={false} href={to} className={innerClass}>
          {body}
        </Link>
      ) : (
        <span className={innerClass}>{body}</span>
      )}
      {action && (
        <span className={`flex min-h-10 min-w-10 shrink-0 items-center justify-center ${inset === "card" ? "pr-3 sm:pr-4" : ""}`}>
          {action}
        </span>
      )}
    </Tag>
  );
}

/**
 * Rank / serial chip for the `leading` slot. Tinted with `accent` (any CSS
 * colour or var — defaults to the card's `--acc`, then primary); `solid` fills
 * it for the top ranks.
 */
export function StockRank({
  n,
  accent,
  solid = false,
  className = "",
}: {
  n: number | string;
  accent?: string;
  solid?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`stock-rank ${solid ? "stock-rank--solid" : ""} ${className}`}
      style={accent ? ({ "--acc": accent } as CSSProperties) : undefined}
      aria-hidden
    >
      {n}
    </span>
  );
}

/** Icon tile for the `leading` slot (a sector glyph, a coin, a bulb). */
export function StockTile({
  children,
  accent,
  className = "",
}: {
  children: ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <span
      className={`stock-tile ${className}`}
      style={accent ? ({ "--acc": accent } as CSSProperties) : undefined}
      aria-hidden
    >
      {children}
    </span>
  );
}

/**
 * The right-hand value stack when the row is about a number other than the
 * price (a yield, a record date, a match %): the same two-line shape the
 * default price/change column has, so every row's right edge lines up.
 */
export function StockRowValue({
  value,
  sub,
  tone,
  subTone = "muted",
  className = "",
}: {
  value: ReactNode;
  sub?: ReactNode;
  /** Colour of the main value; default = text-main. */
  tone?: StockRowTone;
  subTone?: StockRowTone;
  className?: string;
}) {
  return (
    <span className={`block text-right ${className}`}>
      <span className={`block text-sm font-semibold tabular-nums nums ${tone ? TONE_TEXT[tone] : "text-text-main"}`}>
        {value}
      </span>
      {sub && <span className={`block text-xs font-semibold tabular-nums nums ${TONE_TEXT[subTone]}`}>{sub}</span>}
    </span>
  );
}

/** Small toned pill for `tags` / `trailing` — "New", "Strong", a metric. */
export function StockPill({
  children,
  tone = "muted",
  className = "",
}: {
  children: ReactNode;
  tone?: StockRowTone;
  className?: string;
}) {
  return (
    <span className={`stock-pill stock-pill--${tone} ${TONE_TEXT[tone]} ${className}`}>{children}</span>
  );
}

/** Loading placeholder with the row's exact shape. */
export function StockRowSkeleton({
  rows = 1,
  leading = false,
  size = "md",
  inset = "card",
  as: Tag = "li",
}: {
  rows?: number;
  /** Reserve the leading (rank / tile) slot. */
  leading?: boolean;
  size?: "md" | "sm";
  inset?: "card" | "bleed" | "none";
  as?: "li" | "div";
}) {
  const minH = size === "sm" ? "min-h-12 py-1.5" : "min-h-14 py-2";
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <Tag key={i} className={`flex items-center gap-3 ${minH} ${INSET[inset]}`} aria-hidden>
          {leading && <span className="skeleton h-8 w-8 shrink-0 rounded-md" />}
          <span className="min-w-0 flex-1">
            <span className="skeleton block h-3.5 w-2/3 rounded-sm" />
            <span className="skeleton mt-1.5 block h-3 w-1/3 rounded-sm" />
          </span>
          <span className="shrink-0">
            <span className="skeleton block h-3.5 w-14 rounded-sm" />
            <span className="skeleton mt-1.5 block h-3 w-10 rounded-sm" />
          </span>
        </Tag>
      ))}
    </>
  );
}
