import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowRight } from "@/components/home/personalized/DashIcons";

/** Title row over a swipe rail — an h3 like every card title, an optional
 *  one-line explanation under it, and one "See all" link at 40px. */
export function RailHeader({
  title,
  sub,
  href,
  linkLabel,
}: {
  title: string;
  sub?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
      <span className="min-w-0">
        <h3 className="truncate text-base font-bold text-text-main">{title}</h3>
        {sub && <p className="mt-0.5 text-sm leading-snug text-text-muted">{sub}</p>}
      </span>
      {href && linkLabel && (
        <Link
          href={href}
          prefetch={false}
          className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-primary-ink hover:underline active:opacity-70"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

/** The horizontal snap rail the cards sit in. Bleeds to the screen edge on a
 *  phone so the next card peeks in, which is what says "swipe". From 768px or
 *  on a mouse screen it becomes a wrapping grid (`.dash-rail` in globals.css)
 *  — a hidden-scrollbar rail can't be scrolled with a mouse. */
export function Rail({ children }: { children: ReactNode }) {
  return <div className="dash-rail -mx-4 px-4 sm:mx-0 sm:px-0">{children}</div>;
}

/**
 * One card in a swipe rail: a short title (+ optional tag), one plain line
 * saying what the list is, three stock rows, and a "See …" link at the bottom.
 * Every rail card is the same width and the same shape, so a rail reads as a
 * set — the reason the five separate list cards became one rail. When every
 * row shows the same kind of number, pass `valueLabel` so it is named ONCE
 * over the column instead of under every value.
 */
export default function RailCard({
  title,
  tag,
  sub,
  href,
  linkLabel,
  listLabel,
  valueLabel,
  children,
}: {
  title: string;
  tag?: ReactNode;
  sub?: string;
  href: string;
  linkLabel: string;
  /** Small label over the rows, left ("Top 3"). */
  listLabel?: string;
  /** Small label over the value column, right ("Cash yield"). */
  valueLabel?: string;
  /** StockRow size="sm" rows. */
  children: ReactNode;
}) {
  const labels = listLabel || valueLabel;
  return (
    <article className="soft-card dash-box rail-card flex flex-col overflow-hidden">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <span className="flex items-center gap-1.5">
          <h4 className="truncate text-base font-bold leading-tight text-text-main">{title}</h4>
          {tag}
        </span>
        {sub && <p className="mt-1 line-clamp-2 text-sm leading-snug text-text-muted">{sub}</p>}
      </div>
      {labels && (
        <div className="mt-4 flex items-end justify-between gap-3 border-b border-cell-rule px-4 pb-1.5 text-xs text-text-muted sm:px-5">
          <span>{listLabel}</span>
          <span className="text-right">{valueLabel}</span>
        </div>
      )}
      <ul className={`${labels ? "" : "mt-3 "}flex-1 divide-y divide-cell-rule`}>{children}</ul>
      <Link
        href={href}
        prefetch={false}
        className="mx-4 mb-2 mt-1 inline-flex min-h-10 items-center gap-1 self-start text-sm font-semibold text-primary-ink hover:underline active:opacity-70 sm:mx-5"
      >
        {linkLabel}
        <IconArrowRight size={14} />
      </Link>
    </article>
  );
}
