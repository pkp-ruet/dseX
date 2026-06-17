import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Reusable rounded "pill" CTA used for the Bengali promo strips on the
 * marketing homepage (blog promo + find-good-stocks promo). Icon sits in a
 * solid accent circle on the left, bold text in the middle, optional tag, and
 * an arrow that nudges on hover. Accent color is driven by a CSS color token
 * (e.g. `var(--positive)`, `var(--primary)`) so each instance can differ while
 * sharing one layout. Bengali text uses the Hind Siliguri webfont via `.font-bn`.
 */
export default function PromoPill({
  href,
  ariaLabel,
  icon,
  text,
  tag,
  accentVar = "var(--primary)",
  className = "",
}: {
  href: string;
  ariaLabel: string;
  icon: ReactNode;
  text: string;
  tag?: string;
  accentVar?: string;
  className?: string;
}) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Link
        href={href}
        lang="bn"
        aria-label={ariaLabel}
        className="font-bn group inline-flex items-center gap-2.5 sm:gap-3 rounded-full border py-1.5 pl-1.5 pr-3.5 sm:pr-5 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md"
        style={{
          background: `color-mix(in srgb, ${accentVar} 7%, var(--surface))`,
          borderColor: `color-mix(in srgb, ${accentVar} 30%, var(--border))`,
        }}
      >
        {/* Icon in an accent circle */}
        <span
          className="grid place-items-center shrink-0 rounded-full text-white"
          style={{ width: 32, height: 32, background: accentVar }}
        >
          {icon}
        </span>

        {/* Catchy single line */}
        <span className="text-[0.88rem] sm:text-[1.08rem] font-bold leading-snug tracking-tight text-[var(--text)] sm:whitespace-nowrap">
          {text}
        </span>

        {/* Optional tag */}
        {tag && (
          <span
            className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[0.6rem] sm:text-[0.66rem] font-bold text-white"
            style={{ background: accentVar }}
          >
            {tag}
          </span>
        )}

        {/* Arrow nudges on hover */}
        <span
          aria-hidden="true"
          className="shrink-0 text-base sm:text-lg font-bold transition-transform duration-200 group-hover:translate-x-0.5"
          style={{ color: accentVar }}
        >
          →
        </span>
      </Link>
    </div>
  );
}
