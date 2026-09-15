import type { ReactNode } from "react";
import Link from "next/link";
import { accVars } from "@/components/home/personalized/accents";

/**
 * The one card header used across the logged-in dashboard — gradient icon tile,
 * small uppercase title, optional chips beside it, optional right-hand link or
 * slot. Every card (money, attention, your stocks, ideas, market today) uses
 * this so the page reads as one system instead of four header styles.
 *
 * It also carries the card's colour: `accent` sets `--acc`, which paints the
 * hairline across the top of the card, the soft tint behind this row and the
 * icon tile (`.dash-head` / `.dash-tile` in globals.css). Nothing in the card
 * body has to change — see accents.ts for the rhythm.
 */
export default function DashHeader({
  title,
  chips,
  href,
  linkLabel,
  right,
  as: Tag = "h2",
  accent,
  icon,
}: {
  title: string;
  /** Small pills rendered right after the title (counts, date, "N new"). */
  chips?: ReactNode;
  /** Right-aligned quiet link ("View all 12 →"). */
  href?: string;
  linkLabel?: string;
  /** Custom right slot — wins over href/linkLabel. */
  right?: ReactNode;
  as?: "h2" | "h3";
  /** The card's colour, from `ACC` in accents.ts. Defaults to clay. */
  accent?: string;
  /** Glyph for the gradient tile, from DashIcons (no emoji on this page). */
  icon?: ReactNode;
}) {
  return (
    <div
      className="dash-head flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 sm:px-5"
      style={accVars(accent)}
    >
      {/* The title is the one thing here that may shrink (ellipsis); chips stay
          whole and the right-hand link is shrink-0. Before, every child was
          shrink-0 and the chips painted over the link on 360px phones. */}
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {icon && (
          <span className="dash-tile" aria-hidden>
            {icon}
          </span>
        )}
        <Tag className="min-w-0 truncate text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">{title}</Tag>
        {chips}
      </span>
      {right ??
        (href && linkLabel ? (
          <Link
            href={href}
            prefetch={false}
            className="shrink-0 text-xs font-semibold hover:underline active:opacity-70"
            style={{ color: "var(--acc, var(--primary))" }}
          >
            {linkLabel} →
          </Link>
        ) : null)}
    </div>
  );
}

/** Quiet pill for DashHeader chips. `tone="accent"` tints it with the card's
 *  own accent (inherited via `--acc`), so a count chip matches its header. */
export function HeaderChip({
  children,
  tone = "muted",
  className = "",
}: {
  children: ReactNode;
  tone?: "muted" | "accent";
  /** e.g. `hidden sm:inline` to drop a low-value chip on narrow phones. */
  className?: string;
}) {
  return tone === "accent" ? (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-extrabold ${className}`}
      style={{
        color: "var(--acc, var(--primary))",
        background: "color-mix(in srgb, var(--acc, var(--primary)) 13%, transparent)",
      }}
    >
      {children}
    </span>
  ) : (
    <span className={`shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[0.68rem] font-bold text-[var(--text-muted)] ${className}`}>
      {children}
    </span>
  );
}
