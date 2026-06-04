import Link from "next/link";

interface Props {
  accent: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Bolder border + accent shadow (used for the action/quiz card). */
  elevated?: boolean;
  /** When set, the whole card is a link (body must have no nested links). */
  href?: string;
  /** Optional element on the right of the header (e.g. a CTA pill). */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared chrome for the three "Recommended for you" cards so they read as one
 * family: same radius/border/shadow/header, each with a soft tint of its own
 * accent colour. Bodies stay distinct (pick grid / chips / tip rows).
 */
export default function RecommendCard({
  accent,
  icon,
  title,
  subtitle,
  elevated = false,
  href,
  headerRight,
  children,
}: Props) {
  const cardStyle: React.CSSProperties = {
    background: "var(--surface)",
    borderColor: `color-mix(in srgb, ${accent} ${elevated ? 34 : 18}%, var(--border))`,
    boxShadow: elevated
      ? `0 10px 26px -16px color-mix(in srgb, ${accent} 45%, transparent)`
      : "0 4px 16px rgba(15,23,42,0.05)",
  };

  const inner = (
    <>
      <header className="flex items-center gap-3 px-4 sm:px-5 pt-4 pb-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[0.98rem] font-extrabold tracking-tight text-[var(--text)] leading-tight truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
              {subtitle}
            </p>
          )}
        </div>
        {headerRight}
      </header>
      <div className="px-3 sm:px-4 pb-4">{children}</div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg"
        style={cardStyle}
      >
        {inner}
      </Link>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border" style={cardStyle}>
      {inner}
    </section>
  );
}
