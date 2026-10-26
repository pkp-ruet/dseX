import type { ReactNode } from "react";
import Link from "next/link";
import { accVars } from "@/components/home/personalized/accents";

/**
 * The one card header used across the logged-in dashboard — sentence-case h3
 * title (the chapter title above it is the h2), optional chips beside it,
 * optional right-hand link or slot. No icon and no colour: the chapter title
 * carries the icon, and colour is kept for meaning (up/down, Buy/Sell, grades).
 * `accent` still sets `--acc` for the few chips that read it.
 */
export default function DashHeader({
  title,
  sub,
  chips,
  href,
  linkLabel,
  right,
  as: Tag = "h3",
  accent,
}: {
  title: string;
  /** One short line under the title saying what the card is for. */
  sub?: string;
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
  /** Accepted for old callers; not drawn. Icons sit on the chapter title only
   *  (ChapterHead) — twenty grey tiles down the page were noise. */
  icon?: ReactNode;
}) {
  return (
    <div
      className="dash-head flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5"
      style={accVars(accent)}
    >
      {/* The title is the one thing here that may shrink (ellipsis); chips stay
          whole and the right-hand link is shrink-0. Before, every child was
          shrink-0 and the chips painted over the link on 360px phones. */}
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <Tag className="min-w-0 truncate text-base font-bold text-text-main">{title}</Tag>
          {chips}
        </span>
        {sub && <p className="mt-0.5 text-sm leading-snug text-text-muted">{sub}</p>}
      </span>
      {right ??
        (href && linkLabel ? (
          <Link
            href={href}
            prefetch={false}
            className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-primary-ink hover:underline active:opacity-70"
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
    <span className={`shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary-ink ${className}`}>
      {children}
    </span>
  ) : (
    <span className={`shrink-0 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-bold text-text-muted ${className}`}>
      {children}
    </span>
  );
}
