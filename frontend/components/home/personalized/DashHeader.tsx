import type { ReactNode } from "react";
import Link from "next/link";

/**
 * The one card header used across the logged-in dashboard — small uppercase
 * title on the left, optional chips beside it, optional right-hand link or
 * slot. Every card (money, attention, your stocks, ideas, market today) uses
 * this so the page reads as one system instead of four header styles.
 */
export default function DashHeader({
  title,
  chips,
  href,
  linkLabel,
  right,
  as: Tag = "h2",
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
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 sm:px-5">
      {/* The title is the one thing here that may shrink (ellipsis); chips stay
          whole and the right-hand link is shrink-0. Before, every child was
          shrink-0 and the chips painted over the link on 360px phones. */}
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Tag className="min-w-0 truncate text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">{title}</Tag>
        {chips}
      </span>
      {right ??
        (href && linkLabel ? (
          <Link
            href={href}
            prefetch={false}
            className="shrink-0 text-xs font-semibold text-[var(--primary)] hover:underline active:opacity-70"
          >
            {linkLabel} →
          </Link>
        ) : null)}
    </div>
  );
}

/** Quiet pill for DashHeader chips. `tone="accent"` tints it primary. */
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
    <span className={`shrink-0 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2 py-0.5 text-[0.68rem] font-extrabold text-[var(--primary)] ${className}`}>
      {children}
    </span>
  ) : (
    <span className={`shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[0.68rem] font-bold text-[var(--text-muted)] ${className}`}>
      {children}
    </span>
  );
}
