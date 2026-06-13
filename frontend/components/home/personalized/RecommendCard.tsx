import Link from "next/link";

interface Props {
  accent: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Kept for API compatibility — chrome is now uniform (soft-card). */
  elevated?: boolean;
  /** When set, the whole card is a link (body must have no nested links). */
  href?: string;
  /** Optional element on the right of the header (e.g. a "View all →" link). */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared chrome for the "Recommended for you" cards. Matches the clean
 * `soft-card` family used elsewhere on the dashboard: neutral border, soft
 * shadow, bordered header with a small uppercase label. The accent only tints
 * a small header icon; bodies stay distinct (pick grid / chips / tip rows).
 */
export default function RecommendCard({
  accent,
  icon,
  title,
  subtitle,
  href,
  headerRight,
  children,
}: Props) {
  const inner = (
    <>
      <header className="flex items-center gap-2.5 px-4 sm:px-5 py-3 border-b border-[var(--border)]">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--text)] leading-tight truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
        {headerRight}
      </header>
      <div className="px-4 sm:px-5 py-4">{children}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group soft-card hover-lift block overflow-hidden">
        {inner}
      </Link>
    );
  }

  return <section className="soft-card overflow-hidden">{inner}</section>;
}
