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
  /** Larger, bolder header: gradient icon chip + non-uppercase title. */
  prominent?: boolean;
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
  prominent = false,
  children,
}: Props) {
  const inner = (
    <>
      {/* Slim gradient top-line — the premium accent that also tells the cards
          apart (blue picks / teal tips) without a heavy color band. */}
      <div
        className="h-[3px] w-full"
        style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 35%, transparent))` }}
        aria-hidden
      />
      <header
        className={`flex items-center border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-5 ${
          prominent ? "gap-3.5 py-4" : "gap-3 py-3.5"
        }`}
      >
        <span
          className={`grid shrink-0 place-items-center text-white ${
            prominent ? "h-11 w-11 rounded-2xl" : "h-9 w-9 rounded-xl"
          }`}
          style={{
            background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 62%, #000))`,
            boxShadow: `0 6px 16px -8px color-mix(in srgb, ${accent} 80%, transparent)`,
          }}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={`font-extrabold tracking-tight text-[var(--text)] leading-tight truncate ${
              prominent ? "text-[1.18rem]" : "text-[0.98rem]"
            }`}
          >
            {title}
          </h3>
          {subtitle && (
            <p className={`text-[var(--text-muted)] ${prominent ? "text-[0.76rem]" : "text-[0.72rem]"}`}>
              {subtitle}
            </p>
          )}
        </div>
        {headerRight}
      </header>
      <div className="px-4 sm:px-5 py-4 bg-[var(--surface-2)]">{children}</div>
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
