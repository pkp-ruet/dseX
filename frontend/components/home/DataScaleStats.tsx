interface Stat {
  value: string;
  label: string;
}

export default function DataScaleStats({ totalCount, sectorCount }: { totalCount: number; sectorCount: number }) {
  const stats: Stat[] = [
    { value: `${totalCount}+`, label: "Stocks scored" },
    { value: "5", label: "Fundamental pillars" },
    { value: sectorCount > 0 ? `${sectorCount}` : "All", label: "DSE sectors covered" },
    { value: "Daily", label: "Data updates" },
  ];

  return (
    <section className="soft-card px-5 sm:px-7 py-7 sm:py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-3xl sm:text-4xl font-bold tabular-nums text-[var(--primary)] leading-none">
              {s.value}
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
