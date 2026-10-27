import type { ReactNode } from "react";

/**
 * Standard landing-page section heading: an optional small label, the headline
 * and one line under it. Pass `<T en bn />` for each so the page reads in one
 * language (docs/voice.md).
 *
 * Since the 2026-10 redesign it draws the same plain heading as the shared
 * `components/ui/SectionHeader` (sentence-case label, bold headline, one
 * line under it). The old accent props stay so callers don't change.
 */
export default function SectionHead({
  eyebrow,
  title,
  highlight,
  sub,
  id,
  accent = "var(--primary)",
  icon,
  className = "",
}: {
  /** Small label above the headline, e.g. "How the score is built". */
  eyebrow?: ReactNode;
  /** The headline, in plain words. */
  title: ReactNode;
  /** Optional trailing phrase of the headline, painted in the accent colour. */
  highlight?: string;
  /** One line under the headline (`<T>`). */
  sub?: ReactNode;
  id?: string;
  /** Section accent colour — a CSS token, e.g. "var(--info)". */
  accent?: string;
  /** Small icon rendered inside the eyebrow pill (16×16 viewBox 24). */
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* 2026-10 redesign (decision 6): a plain sentence-case label and a plain
          headline. `accent`, `icon` and `highlight` are accepted but no longer
          paint anything — colour on the landing page lives in the data. */}
      {eyebrow && <p className="text-sm font-semibold text-text-muted">{eyebrow}</p>}
      <h2
        id={id}
        className={`text-balance text-2xl font-bold leading-tight tracking-tight text-text-main sm:text-3xl ${
          eyebrow ? "mt-1.5" : ""
        }`}
      >
        {title}
        {highlight && <> {highlight}</>}
      </h2>
      {sub && <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-text-muted">{sub}</p>}
    </div>
  );
}
