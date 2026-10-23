import type { ReactNode } from "react";

/**
 * Standard landing-page section heading.
 *
 * Copy rule, applied everywhere on `/`: the headline is **English in easy words**,
 * and directly under it sits **one simple Bengali line** explaining it. There is
 * no language toggle. Small UI text (chips, buttons, table headers, metric
 * labels) stays English only.
 *
 * Since the 2026-10 redesign it draws the same plain heading as the shared
 * `components/ui/SectionHeader` (sentence-case label, bold headline, Bengali
 * line). The old accent props stay so callers don't change.
 */
export default function SectionHead({
  eyebrow,
  title,
  highlight,
  bn,
  id,
  accent = "var(--primary)",
  icon,
  className = "",
}: {
  /** Small label above the headline, e.g. "How the score is built". */
  eyebrow?: string;
  /** The headline. English, plain words, no jargon. */
  title: string;
  /** Optional trailing phrase of the headline, painted in the accent colour. */
  highlight?: string;
  /** One simple Bengali sentence explaining the headline. */
  bn: string;
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
      <p
        lang="bn"
        className="font-bn mt-1.5 max-w-2xl text-base leading-relaxed text-text-muted"
      >
        {bn}
      </p>
    </div>
  );
}
