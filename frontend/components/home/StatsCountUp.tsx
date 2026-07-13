interface Stat {
  /** Numeric value to show, or null for a fixed text stat. */
  target: number | null;
  /** Rendered text when `target` is null (e.g. "5", "Daily"). */
  text?: string;
  suffix?: string;
  label: string;
}

/**
 * Proof band — four headline numbers. Rendered statically (values shown at
 * their final figure, no scroll-triggered count-up) so the marketing homepage
 * stays smooth while scrolling. Labels + values are in the SSR HTML (SEO).
 */
export default function StatsCountUp({
  totalCount,
  sectorCount,
}: {
  totalCount: number;
  sectorCount: number;
}) {
  const stats: Stat[] = [
    { target: totalCount, suffix: "+", label: "Stocks scored" },
    { target: null, text: "5", label: "Fundamental pillars" },
    sectorCount > 0
      ? { target: sectorCount, label: "DSE sectors covered" }
      : { target: null, text: "All", label: "DSE sectors covered" },
    { target: null, text: "Daily", label: "Data updates" },
  ];

  return (
    <section className="soft-card px-5 sm:px-7 py-7 sm:py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-3xl sm:text-4xl font-bold tabular-nums nums text-[var(--primary)] leading-none">
              {s.target != null ? (
                <>
                  {s.target}
                  {s.suffix}
                </>
              ) : (
                s.text
              )}
            </div>
            <div className="mt-1.5 text-[0.7rem] sm:text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
