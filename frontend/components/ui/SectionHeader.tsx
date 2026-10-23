import Link from "next/link";
import type { ReactNode } from "react";
import Bn from "@/components/i18n/Bn";

/**
 * THE section header (2026-10 redesign, step 0): title, the Bengali line under
 * it, an optional one-sentence lead, and an optional "See all" link on the
 * right. Replaces the four older styles (`section-rule-modern`, landing
 * `SectionHead`, stock `SectionTitle`, dashboard `DashHeader`) as each page is
 * redone — new code uses this one.
 *
 * Sentence case, no uppercase eyebrow, no pill, no rule lines: the space above
 * the header separates the section.
 */
export default function SectionHeader({
  title,
  bn,
  lead,
  action,
  id,
  as: Tag = "h2",
  size = "md",
  className = "",
}: {
  title: ReactNode;
  /** The Bengali line under the title (rendered with lang="bn" + .font-bn). */
  bn?: ReactNode;
  /** One short sentence under the title. */
  lead?: ReactNode;
  /** "See all" link, or any small control, on the right. */
  action?: { href: string; label: string } | ReactNode;
  /** Put on the heading, for aria-labelledby and jump links. */
  id?: string;
  as?: "h2" | "h3";
  /** md = section in a page · lg = a page chapter. */
  size?: "md" | "lg";
  className?: string;
}) {
  const titleCls =
    size === "lg"
      ? "text-xl sm:text-2xl font-bold leading-tight"
      : "text-lg sm:text-xl font-bold leading-tight";

  const actionNode =
    action && typeof action === "object" && "href" in (action as object) ? (
      <Link
        href={(action as { href: string }).href}
        className="inline-flex min-h-10 shrink-0 items-center gap-1 text-sm font-semibold text-primary-ink hover:underline active:opacity-70"
      >
        {(action as { label: string }).label}
        <span aria-hidden="true">→</span>
      </Link>
    ) : (
      (action as ReactNode)
    );

  return (
    <div className={`mb-3 flex items-end justify-between gap-3 ${className}`.trim()}>
      <div className="min-w-0">
        <Tag id={id} className={`${titleCls} text-balance text-text-main`}>
          {title}
        </Tag>
        {bn && <Bn className="mt-0.5 text-sm text-text-muted">{bn}</Bn>}
        {lead && <p className="mt-1 max-w-prose text-sm text-text-muted">{lead}</p>}
      </div>
      {actionNode && <div className="shrink-0">{actionNode}</div>}
    </div>
  );
}
