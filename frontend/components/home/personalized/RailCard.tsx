import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowRight } from "@/components/home/personalized/DashIcons";

/** Title row over a swipe rail — an h3 like every card title, with one
 *  "See all" link at 40px. */
export function RailHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
      <h3 className="min-w-0 truncate text-base font-bold text-text-main">{title}</h3>
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
 * saying what the list is, three stock rows, and a "See …" link pinned to the
 * bottom. Every rail card is the same width and the same shape, so a rail
 * reads as a set — the reason the five separate list cards became one rail.
 */
export default function RailCard({
  title,
  tag,
  sub,
  href,
  linkLabel,
  children,
}: {
  title: string;
  tag?: ReactNode;
  sub?: string;
  href: string;
  linkLabel: string;
  /** StockRow size="sm" rows. */
  children: ReactNode;
}) {
  return (
    <article className="soft-card dash-box rail-card flex flex-col overflow-hidden">
      <div className="px-4 pt-4">
        <span className="flex items-center gap-1.5">
          <h4 className="truncate text-sm font-bold leading-tight text-text-main">{title}</h4>
          {tag}
        </span>
        {sub && <span className="mt-0.5 block text-xs leading-snug text-text-muted">{sub}</span>}
      </div>
      <ul className="mt-2 flex-1 divide-y divide-cell-rule">{children}</ul>
      <Link
        href={href}
        prefetch={false}
        className="flex min-h-10 items-center justify-center gap-1 border-t border-border px-4 py-2 text-xs font-semibold text-primary-ink transition-colors hover:bg-surface-2 active:bg-surface-2"
      >
        {linkLabel}
        <IconArrowRight size={12} />
      </Link>
    </article>
  );
}
