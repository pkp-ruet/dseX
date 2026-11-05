import type { ReactNode } from "react";
import Link from "next/link";
import { IconArrowRight } from "@/components/ui/icons";

/**
 * THE card of the dashboard's "Find stocks" chapter (2026-11-06): the
 * screener, the ranking and the research blocks all open and close the same
 * way, and match "Picked for you" above them —
 *
 *   eyebrow (icon + what it is, a gold Premium tag where it is Premium)
 *   title (h3) + one lead line                          See all →
 *   … the block's own body …
 *   one full-width link to the full page
 *
 * `tone="gold"` = a Premium block (gold eyebrow and edge). Styles `fc-*`
 * in `app/styles/find.css`.
 */
export default function FindCard({
  id,
  icon,
  eyebrow,
  tag,
  title,
  lead,
  href,
  allLabel,
  footLabel,
  tone = "clay",
  children,
}: {
  id: string;
  icon: ReactNode;
  eyebrow: ReactNode;
  /** A small pill after the eyebrow ("Free", "Premium"). */
  tag?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  href: string;
  /** The short link beside the title (hidden on small phones; the foot says it). */
  allLabel: ReactNode;
  footLabel: ReactNode;
  tone?: "clay" | "gold";
  children: ReactNode;
}) {
  return (
    <section className={`soft-card fc fc--${tone}`} aria-labelledby={`${id}-title`}>
      <header className="fc-top">
        <p className="fc-eyebrow">
          <span className="fc-eyebrow-icon" aria-hidden="true">
            {icon}
          </span>
          {eyebrow}
          {tag && <span className="fc-tag">{tag}</span>}
        </p>
        <div className="fc-headline">
          <div className="min-w-0">
            <h3 id={`${id}-title`} className="fc-title">
              {title}
            </h3>
            {lead && <p className="fc-lead">{lead}</p>}
          </div>
          <Link prefetch={false} href={href} className="fc-all">
            {allLabel}
            <IconArrowRight size={14} />
          </Link>
        </div>
      </header>
      {children}
      <Link prefetch={false} href={href} className="fc-foot">
        {footLabel}
        <IconArrowRight size={16} />
      </Link>
    </section>
  );
}
