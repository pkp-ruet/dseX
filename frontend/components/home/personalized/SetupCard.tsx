import Link from "next/link";
import { type ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  blurb: string;
  ctaLabel: string;
  ctaHref: string;
  children?: ReactNode;
}

/** Onboarding nudge card for an empty watchlist/portfolio. */
export default function SetupCard({ icon, title, blurb, ctaLabel, ctaHref, children }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 flex flex-col">
      <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--surface-2)] text-[var(--primary)]">
        {icon}
      </div>
      <h3 className="mt-3 text-lg font-extrabold text-[var(--text)] leading-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-[var(--text-muted)] leading-relaxed">{blurb}</p>
      {children}
      <Link
        href={ctaHref}
        className="mt-4 inline-flex self-start items-center gap-1.5 min-h-[44px] px-5 rounded-xl font-semibold text-sm text-white bg-[var(--primary)] hover:brightness-110 transition"
      >
        {ctaLabel} →
      </Link>
    </div>
  );
}
