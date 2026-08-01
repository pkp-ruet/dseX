import type { ReactNode } from "react";

/**
 * Standard landing-page section heading.
 *
 * Copy rule, applied everywhere on `/`: the headline is **English in easy words**,
 * and directly under it sits **one simple Bengali line** explaining it. There is
 * no language toggle. Small UI text (chips, buttons, table headers, metric
 * labels) stays English only.
 *
 * Each section passes its own `accent` so the page picks up a colour rhythm as
 * you scroll — the eyebrow becomes a tinted pill with an optional icon, and the
 * headline can carry one accented phrase via `highlight`.
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
      {eyebrow && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em]"
          style={{
            color: accent,
            background: `color-mix(in srgb, ${accent} 11%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accent} 24%, transparent)`,
          }}
        >
          {icon && (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {icon}
            </svg>
          )}
          {eyebrow}
        </span>
      )}
      <h2
        id={id}
        className={`font-display text-[clamp(1.6rem,4.8vw,2.35rem)] font-bold leading-[1.12] tracking-tight text-[var(--text)] ${
          eyebrow ? "mt-3" : ""
        }`}
      >
        {title}
        {highlight && (
          <>
            {" "}
            <span style={{ color: accent }}>{highlight}</span>
          </>
        )}
      </h2>
      <p
        lang="bn"
        className="font-bn mt-2.5 max-w-2xl text-[0.95rem] font-medium leading-relaxed text-[var(--text-muted)]"
      >
        {bn}
      </p>
    </div>
  );
}
